import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom"
import icon from "data-base64:~assets/icon.png"

import { convertHtmlToMarkdown } from "dom-to-semantic-markdown";
import type { WebHistory } from "~utils/interfaces";
import { getRenderedHtml } from "~utils/commons";
import Loading from "./Loading";

import brain from "data-base64:~assets/brain.png"
import { Storage } from "@plasmohq/storage"

import { sendToBackground } from "@plasmohq/messaging"

import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "~/lib/utils"
import { Button } from "~/routes/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/routes/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/routes/ui/popover"
import { useToast } from "~routes/ui/use-toast";


const HomePage = () => {
  const { toast } = useToast()
  const navigation = useNavigate()
  const [noOfWebPages, setNoOfWebPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState<string>("")
  // const [selectedsearchspace, setSelectedSearchSpace] = useState();
  const [searchspaces, setSearchSpaces] = useState([])


  useEffect(() => {
    const checkSearchSpaces = async () => {
      const storage = new Storage({ area: "local" })
      const token = await storage.get('token');
      try {
        const response = await fetch(
          `${process.env.PLASMO_PUBLIC_BACKEND_URL!}/user/${token}/searchspaces/`
        );

        if (!response.ok) {
          throw new Error("Token verification failed");
        } else {
          const res = await response.json()
          console.log(res)
          setSearchSpaces(res)
        }
      } catch (error) {
        await storage.remove('token');
        await storage.remove('showShadowDom');
        // goTo(LoginForm);
        navigation("/login")
      }
    };

    checkSearchSpaces();
    setLoading(false);
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
          setValue(searchspace)
        }
        // else{
        //   await storage.set("search_space", 'GENERAL')
        // }

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
        toast({
          title: "History Store Deleted!",
          variant: "destructive",
        })
      });
    } catch (error) {
      console.log(error);
    }
  }

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
            includeMetaData: false,
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

        toast({
          title: "Saved Snapshot !",
        })
      }

    });
  }

  const saveDatamessage = async () => {

    if (value === ""){
      toast({
        title: "Select a SearchSpace !",
      })
      return
    }

    toast({
      title: "Save Job Running !",
    })

    const resp = await sendToBackground({
      // @ts-ignore
      name: "savedata",
    })

    toast({
      title: resp.message,
    })
    // toast.success(resp.message, {
    //   position: "bottom-center"
    // });
  }


  async function logOut(): Promise<void> {
    const storage = new Storage({ area: "local" })
    storage.remove('token');
    // goTo(LoginForm)
    navigation("/login")
  }

  // const handleSearchSpaceSubmit = async (event: { preventDefault: () => void; }) => {
  //   event.preventDefault();

  //   const storage = new Storage({ area: "local" })

  //   await storage.set("search_space", searchspace);

  //   setSearchSpace(searchspace)
  //   // toast.info("Updated Search Space !", {
  //   //   position: "bottom-center"
  //   // });
  // }


  if (loading) {
    return <Loading />;
  } else {
    return (
      searchspaces.length === 0 ? (
        <>
          <div className="dark bg-gray-900 flex flex-col items-center justify-center p-4">
            <div className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
              <img className="w-8 h-8 mr-2 rounded-full" src={icon} alt="logo" />
              SurfSense
            </div>
            <div className="dark:text-white border border-gray-200 rounded-lg shadow-md dark:bg-gray-800 dark:border-gray-700 p-6 mb-4">
              Please Create a Search Space to Continue
            </div>
          </div>
        </>
      ) : (
        <>
          <section className="dark min-h-screen bg-gray-900 p-4">
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
                <img className="w-8 h-8 mr-2 rounded-full" src={icon} alt="logo" />
                SurfSense
              </div>
              <div className="w-full max-w-md bg-white rounded-lg shadow-sm dark:bg-gray-800">
                <div className="p-5 space-y-4">
                  <div className="flex justify-between gap-4">

                    <button
                      type="button"
                      onClick={() => logOut()}
                      className="p-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800">
                      <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" x2="9" y1="12" y2="12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="bg-white border border-gray-200 rounded-lg shadow-md dark:bg-gray-800 dark:border-gray-700">
                      <div className="flex flex-col gap-4 justify-center items-center text-xl font-semibold text-gray-900 dark:text-white p-4">
                        <div className="flex flex-col gap-2 w-full grow p-3 border rounded-md items-center bg-gray-100 dark:bg-gray-700">
                          <img className="w-24 h-24 rounded-full mb-2" src={brain} alt="brain" />
                          <div className="text-center text-lg">
                            {noOfWebPages}
                          </div>
                        </div>
                        <div className="max-w-sm">
                          <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-[200px] justify-between"
                              >
                                {value
                                  ? searchspaces.find((space) => space.name === value)?.name
                                  : "Select Search Space..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[200px] p-0">
                              <Command>
                                <CommandInput placeholder="Search Spaces..." />
                                <CommandList>
                                  <CommandEmpty>No Search Spaces found.</CommandEmpty>
                                  <CommandGroup>
                                    {searchspaces.map((space) => (
                                      <CommandItem
                                        key={space.name}
                                        value={space.name}
                                        onSelect={async (currentValue) => {
                                          const storage = new Storage({ area: "local" })
                                          currentValue === value ? await storage.set("search_space", "") : await storage.set("search_space", space.name);
                                          currentValue === value ? await storage.set("search_space_id", searchspaces.find((space) => space.name === currentValue).id!) : await storage.set("search_space_id", space.id);
                                          // setSelectedSearchSpace(currentValue === value ? {} : searchspaces.find((space) => space.name === currentValue)!)
                                          setValue(currentValue === value ? "" : space.name)
                                          setOpen(false)
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            value === space.name ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {space.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        className="w-full text-white bg-gradient-to-r from-red-400 via-red-500 to-red-600 hover:bg-gradient-to-br focus:ring-4 focus:ring-red-300 dark:focus:ring-red-800 rounded-lg text-sm px-5 py-2.5"
                        onClick={() => clearMem()}>
                        Clear Inactive History Sessions
                      </button>
                      <button
                        type="button"
                        className="w-full text-gray-900 bg-gradient-to-r from-yellow-200 to-red-300 hover:bg-gradient-to-bl focus:ring-4 focus:ring-red-100 dark:focus:ring-red-400 rounded-lg text-sm px-5 py-2.5"
                        onClick={() => saveCurrSnapShot()}>
                        Save Current Webpage Snapshot
                      </button>
                      <button
                        type="button"
                        className="w-full text-gray-900 bg-gradient-to-r from-teal-200 to-lime-200 hover:bg-gradient-to-l hover:from-teal-200 hover:to-lime-200 focus:ring-4 focus:ring-lime-200 dark:focus:ring-teal-700 rounded-lg text-sm px-5 py-2.5"
                        onClick={() => saveDatamessage()}>
                        Save to SurfSense
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )

    )
  }
};

export default HomePage