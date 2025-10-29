import { useState } from 'react'
import './App.css'
import "./ui/styles/index.css";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Home from "./ui/page/Home";
import Plan from "./ui/page/Plan";
import ChatPage from "./ui/page/ChatPage";


function App() {
  return (
    <div className="fixed inset-0 flex justify-center items-center bg-[#1B1B1B] overflow-hidden">
      {/* 모바일 프레임 (Layout 역할) */}
      <div
        className="w-[430px] h-[860px] bg-white rounded-3xl shadow-2xl flex flex-col justify-center items-center text-center"
        style={{
          transform: "scale(0.7)", //브라우저 맟추어서 축소
          transformOrigin: "center center",
        }}
      >
      </div>
    </div>
  );
}

export default App;

