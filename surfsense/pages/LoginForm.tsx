import React, { useState } from "react";
import { goTo } from "react-chrome-extension-router";
import { Popup } from "../popup";

import { Storage } from "@plasmohq/storage"

const storage = new Storage({
    area: "local"
  })

export const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


  const validateForm = () => {
    if (!username || !password) {
      setError('Username and password are required');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (event: { preventDefault: () => void; }) => {
    event.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    const formDetails = new URLSearchParams();
    formDetails.append('username', username);
    formDetails.append('password', password);

    try {
      const response = await fetch(`${process.env.PLASMO_PUBLIC_BACKEND_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formDetails,
      });

      setLoading(false);

      if (response.ok) {
        const data = await response.json();
        await storage.set('token', data.access_token);
        goTo(Popup);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Authentication failed!');
      }
    } catch (error) {
      setLoading(false);
      setError('An error occurred. Please try again later.');
    }
  };

  // const goToRegister = async () => {
  //   console.log("Reg")
  //   goTo(RegisterForm)
  // }
  return (
    <>
      <section className="dark bg-gray-50 dark:bg-gray-900">
        {/* <div onClick={() => clearMem}>CLEAR MEM</div> */}
        <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
          <a href="#" className="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
            <img className="w-8 h-8 mr-2" src={icon} alt="logo" />
            SurfSense
          </a>
          <div className="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
            <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
                Sign in to your account
              </h1>
              <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} name="email" id="email" className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" placeholder="name" />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} name="password" id="password" placeholder="••••••••" className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-primary-600 focus:border-primary-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500" />
                </div>
                <button type="submit" disabled={loading} className="w-full text-white bg-primary-600 hover:bg-primary-700 focus:ring-4 focus:outline-none focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">{loading ? 'Logging in...' : 'Login'}</button>
                <p className="text-sm font-light text-gray-500 dark:text-gray-400">
                  Don’t have an account yet? <a href="https://www.surfsense.net/signup" className="font-medium text-primary-600 hover:underline dark:text-primary-500" >Sign up</a>
                </p>
                {error && <p style={{ color: 'red' }}>{error}</p>}
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
