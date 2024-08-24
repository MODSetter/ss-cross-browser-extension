import { getRenderedHtml, initQueues, initWebHistory } from "components/commons"
import type { WebHistory } from "components/interfaces"

import { Storage } from "@plasmohq/storage"

const storage = new Storage({
    area: "local"
  })

chrome.tabs.onCreated.addListener(async (tab: any) => {
  try {
    await initWebHistory(tab.id)
    await initQueues(tab.id)
  } catch (error) {
    console.log(error)
  }
})

chrome.tabs.onUpdated.addListener(
  async (tabId: number, changeInfo: any, tab: any) => {
    if (changeInfo.status === "complete" && tab.url) {
      await initWebHistory(tab.id)
      await initQueues(tab.id)

      const result = await chrome.scripting.executeScript({
        // @ts-ignore
        target: { tabId: tab.id },
        // @ts-ignore
        function: getRenderedHtml
      })

      let toPushInTabHistory: any = result[0].result // const { renderedHtml, title, url, entryTime } = result[0].result;

      let urlQueueListObj: any = await storage.get("urlQueueList");
      let timeQueueListObj: any = await storage.get("timeQueueList");

      urlQueueListObj.urlQueueList
        .find((data: WebHistory) => data.tabsessionId === tabId)
        .urlQueue.push(toPushInTabHistory.url)
      timeQueueListObj.timeQueueList
        .find((data: WebHistory) => data.tabsessionId === tabId)
        .timeQueue.push(toPushInTabHistory.entryTime)

      await storage.set("urlQueueList",{
        urlQueueList: urlQueueListObj.urlQueueList
      })
      await storage.set("timeQueueList",{
        timeQueueList: timeQueueListObj.timeQueueList
      })
    }
  }
)

chrome.tabs.onRemoved.addListener(async (tabId: number, removeInfo: object) => {
  let urlQueueListObj: any = await storage.get("urlQueueList");
  let timeQueueListObj: any = await storage.get("timeQueueList");
  if (urlQueueListObj.urlQueueList && timeQueueListObj.timeQueueList) {
    const urlQueueListToSave = urlQueueListObj.urlQueueList.map(
      (element: WebHistory) => {
        if (element.tabsessionId !== tabId) {
          return element
        }
      }
    )
    const timeQueueListSave = timeQueueListObj.timeQueueList.map(
      (element: WebHistory) => {
        if (element.tabsessionId !== tabId) {
          return element
        }
      }
    )
    await storage.set("urlQueueList",{
      urlQueueList: urlQueueListToSave.filter((item: any) => item)
    })
    await storage.set("timeQueueList",{
      timeQueueList: timeQueueListSave.filter((item: any) => item)
    })
  }
})