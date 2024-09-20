import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"
import icon from "data-base64:~assets/icon.png"

import { toast } from 'react-toastify';

import { convertHtmlToMarkdown } from "dom-to-semantic-markdown";
import type { WebHistory } from "~utils/interfaces";
import { webhistoryToLangChainDocument, emptyArr, getRenderedHtml } from "~utils/commons";
import Loading from "./Loading";

import brain from "data-base64:~assets/brain.png"
import { Storage } from "@plasmohq/storage"

import { sendToBackground } from "@plasmohq/messaging"



async function clearMem(): Promise<void> {
  try {
    const storage = new Storage({ area: "local" })

    let webHistory: any = await storage.get("webhistory");
    let urlQueue: any = await storage.get("urlQueueList");
    let timeQueue: any = await storage.get("timeQueueList");

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


      await storage.set("webhistory", { webhistory: newHistory.filter((item: any) => item) });
      await storage.set("urlQueueList", { urlQueueList: newUrlQueue.filter((item: any) => item) });
      await storage.set("timeQueueList", { timeQueueList: newTimeQueue.filter((item: any) => item) });

      toast.info("History Store Deleted!", {
        position: "bottom-center"
      });
    });
  } catch (error) {
    console.log(error);
  }
}


const HomePage = () => {
  const navigation = useNavigate()
  const [noOfWebPages, setNoOfWebPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const [searchspace, setSearchSpace] = useState('');


  useEffect(() => {
    const verifyToken = async () => {
      const storage = new Storage({ area: "local" })
      const token = await storage.get('token');
      // console.log(token)
      try {
        const response = await fetch(`${process.env.PLASMO_PUBLIC_BACKEND_URL}/verify-token/${token}`);

        if (!response.ok) {
          throw new Error('Token verification failed');
        } else {
          const OPENAIKEY = await storage.get('openaikey');

          const check = (OPENAIKEY)
          if (!check) {
            // goTo(FillEnvVariables);
            navigation("/settings")
          }
        }
      } catch (error) {
        await storage.remove('token');
        await storage.remove('showShadowDom');
        // goTo(LoginForm);
        navigation("/login")
      }



    };

    verifyToken();
    setLoading(false)
  }, []);


  useEffect(() => {
    async function onLoad() {
      try {
        chrome.storage.onChanged.addListener(
          (changes: any, areaName: string) => {
            if (changes.webhistory) {
              // console.log("changes.webhistory", changes.webhistory)
              const webhistory = JSON.parse(changes.webhistory.newValue);

              console.log("webhistory", webhistory)

              let sum = 0

              webhistory.webhistory.forEach((element: any) => {
                sum = sum + element.tabHistory.length
              });

              setNoOfWebPages(sum)
            }
            // console.log(changes)
            // console.log(areaName)
          }
        );

        const storage = new Storage({ area: "local" })

        const searchspace = await storage.get("search_space");

        if(searchspace){
          setSearchSpace(searchspace)
        }else{
          await storage.set("search_space", 'GENERAL')
        }

        await storage.set("showShadowDom", true)

        const webhistoryObj: any = await storage.get("webhistory");
        if (webhistoryObj.webhistory.length) {
          const webhistory = webhistoryObj.webhistory;

          if (webhistoryObj) {
            let sum = 0
            webhistory.forEach((element: any) => {
              sum = sum + element.tabHistory.length
            });
            setNoOfWebPages(sum)
          }
        } else {
          setNoOfWebPages(0)
        }


      } catch (error) {
        console.log(error);
      }
    }

    onLoad()
  }, []);

  async function saveCurrSnapShot(): Promise<void> {
    chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
      const storage = new Storage({ area: "local" })
      const tab = tabs[0];
      if (tab.id) {
        // await initWebHistory(tab.id);
        // await initQueues(tab.id);
        const tabId: number = tab.id
        const result = await chrome.scripting.executeScript({
          // @ts-ignore
          target: { tabId: tab.id },
          // @ts-ignore
          func: getRenderedHtml,
        });


        let toPushInTabHistory: any = result[0].result; // const { renderedHtml, title, url, entryTime } = result[0].result;

        // //Updates 'tabhistory'
        let webhistoryObj: any = await storage.get("webhistory");

        const webHistoryOfTabId = webhistoryObj.webhistory.filter(
          (data: WebHistory) => {
            return data.tabsessionId === tab.id;
          }
        );

        toPushInTabHistory.pageContentMarkdown = convertHtmlToMarkdown(
          toPushInTabHistory.renderedHtml,
          {
            extractMainContent: true,
            enableTableColumnTracking: true
          }
        )

        delete toPushInTabHistory.renderedHtml

        let tabhistory = webHistoryOfTabId[0].tabHistory;


        const urlQueueListObj: any = await storage.get("urlQueueList");
        const timeQueueListObj: any = await storage.get("timeQueueList");

        const isUrlQueueThere = urlQueueListObj.urlQueueList.find((data: WebHistory) => data.tabsessionId === tabId)
        const isTimeQueueThere = timeQueueListObj.timeQueueList.find((data: WebHistory) => data.tabsessionId === tabId)


        toPushInTabHistory.duration = toPushInTabHistory.entryTime - isTimeQueueThere.timeQueue[isTimeQueueThere.timeQueue.length - 1]
        if (isUrlQueueThere.urlQueue.length == 1) {
          toPushInTabHistory.reffererUrl = 'START'
        }
        if (isUrlQueueThere.urlQueue.length > 1) {
          toPushInTabHistory.reffererUrl = isUrlQueueThere.urlQueue[isUrlQueueThere.urlQueue.length - 2];
        }

        tabhistory.push(toPushInTabHistory);


        //Update Webhistory
        try {
          webhistoryObj.webhistory.find(
            (data: WebHistory) => data.tabsessionId === tab.id
          ).tabHistory = tabhistory;

          await storage.set("webhistory", {
            webhistory: webhistoryObj.webhistory,
          });
        } catch (error) {
          console.log(error);
        }


        toast.success("Saved Snapshot !", {
          position: "bottom-center"
        });
      }

    });
  }

  const saveDatamessage = async () => {
    const resp = await sendToBackground({
      // @ts-ignore
      name: "savedata",
    })

    toast.success(resp.message, {
      position: "bottom-center"
    });
  }


  async function logOut(): Promise<void> {
    const storage = new Storage({ area: "local" })
    storage.remove('token');
    // goTo(LoginForm)
    navigation("/login")
  }

  const handleSearchSpaceSubmit = async (event: { preventDefault: () => void; }) => {
    event.preventDefault();

    const storage = new Storage({ area: "local" })

    await storage.set("search_space", searchspace);

    setSearchSpace(searchspace)
    toast.info("Updated Search Space !", {
      position: "bottom-center"
    });
  }


  if (loading) {
    return <Loading />;
  } else {
    return (
      <section className="dark bg-gray-50 dark:bg-gray-900">
        {/* <div onClick={() => showMem()}>ShowMem</div> */}
        <div className="flex flex-col items-center justify-center px-4 pt-4 pb-12 mx-auto md:h-screen lg:py-0">
          <div className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
            <img className="w-8 h-8 mr-2" src={icon} alt="logo" />
            SurfSense
          </div>
          <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
            <div className="p-3 space-y-4">
              <div className="flex justify-between">
                <button type="button" onClick={() => navigation('/settings')} className="px-3 py-2 text-xs font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
                </button>
                <button type="button" onClick={() => logOut()} className="px-3 py-2 text-xs font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div className="block max-w-sm p-4 bg-white border border-gray-200 rounded-lg shadow hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                  <div className="flex gap-3 justify-center items-center text-2xl font-semibold text-gray-900 dark:text-white">
                    <div className="flex flex-col gap-2 justify-between grow p-2 border rounded-lg items-center">
                      <div>
                        <img className="w-24 h-24 rounded-full" src={brain} alt="brain" />
                      </div>
                      <div className="text-center">
                        {noOfWebPages}
                      </div>
                    </div>
                    <div className="max-w-40">
                      <form className="space-y-4 md:space-y-6" onSubmit={handleSearchSpaceSubmit}>
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Search Space</label>
                          <input type="text" value={searchspace} onChange={(e) => setSearchSpace(e.target.value)} name="searchspace" id="searchspace" className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="searchspace" />
                        </div>

                        <button type="submit" className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">{'Save'}</button>

                    
                      </form>
                    </div>
                  </div>
                </div>

                <button type="button" className="w-full text-white bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-red-300 dark:focus:ring-red-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center" onClick={() => clearMem()}>Clear Inactive History Sessions</button>
                <button type="button" className="w-full text-gray-900 bg-gradient-to-r from-red-200 via-red-300 to-yellow-200 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-red-100 dark:focus:ring-red-400 font-medium rounded-lg text-sm px-5 py-2.5 text-center" onClick={() => saveCurrSnapShot()}>Save Current Webpage SnapShot</button>
                <button type="button" className="w-full text-gray-900 bg-gradient-to-r from-teal-200 to-lime-200 hover:bg-gradient-to-l hover:from-teal-200 hover:to-lime-200 focus:ring-4 focus:outline-none focus:ring-lime-200 dark:focus:ring-teal-700 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2" onClick={() => saveDatamessage()}>Save to SurfSense</button>

              </div>
            </div>
          </div>
        </div>
      </section>
    )
  }
};

export default HomePage