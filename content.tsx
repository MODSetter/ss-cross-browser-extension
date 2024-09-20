
// MAJOR BUG FAILS TO GET RENDERED HTML SOMETIMES???

// import React, { useEffect, useState } from "react"
// import { toast, ToastContainer } from "react-toastify"
// // @ts-ignore
// import icon from "data-base64:~assets/icon.png"
// // @ts-ignore
// import cssText from "data-text:~tailwind.css"

// import { sendToBackground } from "@plasmohq/messaging"

// import type { PlasmoCSConfig } from "plasmo"
// import { Storage } from "@plasmohq/storage"
 
// export const config: PlasmoCSConfig = {
//   matches: ["<all_urls>"],
//   all_frames: true,
// }


// export const getStyle = () => {
//   const style = document.createElement("style")
//   style.textContent = cssText
//   return style
// }


// const PlasmoOverlay = () => {

//   const [show,setShow] = useState(false)
  
//   const saveSnapshot = async () => {
//     toast.info("Save Job Started !", {
//       position: "bottom-center"
//     });

//     const resp = await sendToBackground({
//       // @ts-ignore
//       name: "savesnapshot",
//     })

//     toast.success(resp.message, {
//       position: "bottom-center"
//     });
//   }

//   useEffect(() => {
//     async function onLoad() {
//       try {
//         const storage = new Storage({ area: "local" })
//         const showShadowDom = await storage.get("showShadowDom")
//         if(showShadowDom){
//           setShow(true)
//         }

//       } catch (error) {
//         console.log(error);
//       }
//     }

//     onLoad()
//   }, []);


//   const openExt = () => {
//       toast.success("Open Extension to Validate User !", {
//         position: "bottom-center"
//       });
//   }


//   return (
//     <>
//       <div className = "fixed bottom-24 right-1">
//         <button
//           type="button"
//           onClick={show ? () => saveSnapshot() : () => openExt()}
//           className="flex max-w-sm w-full bg-gradient-to-r from-indigo-500 via-pink-500 to-yellow-500 hover:from-indigo-600 hover:via-pink-600 hover:to-red-600 focus:outline-none text-white text-2xl uppercase font-bold shadow-md rounded-full mx-auto p-2">
//           <div className="flex sm:flex-cols-12 gap-2">
//             <div className="col-span-1">
//               <img className="w-12 h-12 rounded-full" src={icon} alt="logo" />
//             </div>
//           </div>
//         </button>
//       </div>
//       <div className="fixed bottom-24 right-80">
//         <ToastContainer autoClose={2000} />
//       </div>

//     </>
//   )
  


// }

// export default PlasmoOverlay
