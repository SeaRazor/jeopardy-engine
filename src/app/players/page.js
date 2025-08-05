"use client";
import { useState } from "react";
import { FaUser, FaUsers } from "react-icons/fa";
import Tabs from "../UI/Tabs";
import Persons from "./Persons";
import Teams from "./Teams";
import {FaPeopleGroup} from "react-icons/fa6";

export default function PlayersPage() {
  const [activeTab, setActiveTab] = useState("persons");

  const tabs = [
    { id: "persons", label: "Persons", icon: <FaUser /> },
    { id: "teams", label: "Teams", icon: <FaPeopleGroup /> },
  ];

  return (
    <div className="container">
      <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="tab-content">
        {activeTab === "persons" && <Persons />}
        {activeTab === "teams" && <Teams />}
      </div>
    </div>
  );
}