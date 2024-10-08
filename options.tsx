import React, { useState } from "react";
import { useNavigate } from "react-router-dom"
import icon from "data-base64:~assets/icon.png"
import { Storage } from "@plasmohq/storage"

const OptionsIndex = () => {
  const navigation = useNavigate()
  const storage = new Storage({ area: "local" })
  
  const [openaikey, setOpenaiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!openaikey) {
      setError('All values are required');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (event: { preventDefault: () => void; }) => {
    event.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    await storage.set('openaikey', openaikey);

    setLoading(false);
    navigation("/")
  };


  return (
    <section className="dark bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        <a href="#" className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
          <img className="w-8 h-8 mr-2" src={icon} alt="logo" />
          SurfSense
        </a>
        <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
              Required Values
            </h1>
            <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">OpenAI API Key</label>
                <input type="text" value={openaikey} onChange={(e) => setOpenaiKey(e.target.value)} name="openaikey" id="openaikey" className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="OpenAI API Key" />
              </div>
              <button type="submit" className="mt-4 w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">{loading ? 'Saving....' : 'Save & Proceed'}</button>
              {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}


export default OptionsIndex