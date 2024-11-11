import type { PlasmoMessaging } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

import {
  emptyArr,
  webhistoryToLangChainDocument
} from "~utils/commons"

const clearMemory = async () => {
  try {
    const storage = new Storage({ area: "local" })

    let webHistory: any = await storage.get("webhistory")
    let urlQueue: any = await storage.get("urlQueueList")
    let timeQueue: any = await storage.get("timeQueueList")

    if (!webHistory.webhistory) {
      return
    }

    //Main Cleanup COde
    chrome.tabs.query({}, async (tabs) => {
      //Get Active Tabs Ids
      // console.log("Event Tabs",tabs)
      let actives = tabs.map((tab) => {
        if (tab.id) {
          return tab.id
        }
      })

      actives = actives.filter((item: any) => item)

      //Only retain which is still active
      const newHistory = webHistory.webhistory.map((element: any) => {
        //@ts-ignore
        if (actives.includes(element.tabsessionId)) {
          return element
        }
      })

      const newUrlQueue = urlQueue.urlQueueList.map((element: any) => {
        //@ts-ignore
        if (actives.includes(element.tabsessionId)) {
          return element
        }
      })

      const newTimeQueue = timeQueue.timeQueueList.map((element: any) => {
        //@ts-ignore
        if (actives.includes(element.tabsessionId)) {
          return element
        }
      })

      await storage.set("webhistory", {
        webhistory: newHistory.filter((item: any) => item)
      })
      await storage.set("urlQueueList", {
        urlQueueList: newUrlQueue.filter((item: any) => item)
      })
      await storage.set("timeQueueList", {
        timeQueueList: newTimeQueue.filter((item: any) => item)
      })
    })
  } catch (error) {
    console.log(error)
  }
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const storage = new Storage({ area: "local" })

    const webhistoryObj: any = await storage.get("webhistory")
    const webhistory = webhistoryObj.webhistory
    if (webhistory) {
      let toSaveFinally: any[] = []
      let newHistoryAfterCleanup: any[] = []

      for (let i = 0; i < webhistory.length; i++) {
        const markdownFormat = webhistoryToLangChainDocument(
          webhistory[i].tabsessionId,
          webhistory[i].tabHistory
        )
        toSaveFinally.push(...markdownFormat)
        newHistoryAfterCleanup.push({
          tabsessionId: webhistory[i].tabsessionId,
          tabHistory: emptyArr
        })
      }

      await storage.set("webhistory",{ webhistory: newHistoryAfterCleanup });

      const toSend = {
        documents: toSaveFinally,
        search_space_id: await storage.get("search_space_id"),
        token: await storage.get("token")
      }

      console.log("toSend",toSend)

      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSend)
      }

      const response = await fetch(
        `${process.env.PLASMO_PUBLIC_BACKEND_URL}/user/save/`,
        requestOptions
      )
      const resp = await response.json()
      if (resp.success) {
        await clearMemory()
        res.send({
          message: "Data Saved Successfully"
        })
      }
    }
  } catch (error) {
    console.log(error)
  }
}

export default handler
