"use client";

import MessageCard from "@/components/MessageCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Message } from "@/model/User";
import { ApiResponse } from "@/types/ApiResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { Loader2, RefreshCcw } from "lucide-react";
import ClimbingBoxLoader from "react-spinners/ClimbingBoxLoader";
import HashLoader from "react-spinners/HashLoader";
import { useSession } from "next-auth/react";
import React, { Key, useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { acceptMessageSchema } from "@/schemas/acceptMessageSchema";
import { useToast } from "@/hooks/use-toast";
import CountUp from "@/components/CountUp";
import BlurText from "@/components/BlurText";

type FilterOptions = "all" | "feedback" | "suggestion" | "appreciation";

function UserDashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitchLoading, setIsSwitchLoading] = useState(false);
  const { toast } = useToast();
  const { data: session } = useSession();
  const [profileUrl, setProfileUrl] = useState<string>("");
  const [filter, setFilter] = useState<FilterOptions>("all");

  const form = useForm({
    resolver: zodResolver(acceptMessageSchema),
  });

  const { register, watch, setValue } = form;
  const acceptMessages = watch("acceptMessages");

  const handleDeleteMessage = async (messageId: string) => {
    // Remove the message locally
    const updatedMessages = messages.filter((message) => message._id !== messageId);
    setMessages(updatedMessages);
    setFilteredMessages(updatedMessages);
  };
  

  const fetchAcceptMessages = useCallback(async () => {
    setIsSwitchLoading(true);
    try {
      const response = await axios.get<ApiResponse>("/api/accept-messages");
      setValue("acceptMessages", response.data.isAcceptingMessage);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message ?? "Failed to fetch message settings",
        variant: "destructive",
      });
    } finally {
      setIsSwitchLoading(false);
    }
  }, [setValue, toast]);

  const fetchMessages = useCallback(
    async (refresh: boolean = false) => {
      setIsLoading(true);
      setIsSwitchLoading(true);
      try {
        const response = await axios.get<ApiResponse>("/api/get-messages");
        const fetchedMessages = response.data.messages || [];
        setMessages(fetchedMessages);
        setFilteredMessages(fetchedMessages);
        if (refresh) {
          toast({
            title: "Refreshed Messages",
            description: "Showing latest messages",
          });
        }
      } catch (error) {
        const axiosError = error as AxiosError<ApiResponse>;
        toast({
          title: "Error",
          description:
            axiosError.response?.data.message ?? "Failed to fetch messages",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
        setIsSwitchLoading(false);
      }
    },
    [setValue, toast]
  );

  useEffect(() => {
    if (!session || !session.user) return;

    fetchMessages();
    fetchAcceptMessages();

    // Set profile URL on client side
    setProfileUrl(`${window.location.protocol}//${window.location.host}/u/${session.user.username}`);
  }, [session, fetchAcceptMessages, fetchMessages]);

  const handleSwitchChange = async () => {
    try {
      const response = await axios.post<ApiResponse>("/api/accept-messages", {
        acceptMessages: !acceptMessages,
      });
      setValue("acceptMessages", !acceptMessages);
      toast({
        title: response.data.message,
        variant: "default",
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      toast({
        title: "Error",
        description:
          axiosError.response?.data.message ?? "Failed to update message settings",
        variant: "destructive",
      });
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedFilter = e.target.value as FilterOptions;
    setFilter(selectedFilter);

    if (selectedFilter === "all") {
      setFilteredMessages(messages);
    } else {
      setFilteredMessages(messages.filter((message) => message.purpose === selectedFilter));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(profileUrl);
    toast({
      title: "URL Copied!",
      description: "Profile URL has been copied to clipboard.",
    });
  };

 

  if (!session || !session.user) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-bottom">
        <ClimbingBoxLoader color="#6993ff" size={30} />
      </div>
    );
  }
  return (
    <div className="h-full w-full bg-transparent p-8 sm:px-28 text-white">
      <h1 className="text-4xl md:text-6xl font-extrabold mb-4 text-center bg-btn-gradient bg-clip-text text-transparent">User Dashboard</h1>

      <BlurText
        text={`Welcome  ${session.user.username}!`}
        delay={150}
        animateBy="words"
        direction="top"
        className="text-center text-2xl font-semibold flex justify-center mb-6"
      />

      <div className="bg-gray-900 bg-opacity-50 p-6 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Copy Your Unique Link</h2>
        <div className="flex items-center">
          <input
            type="text"
            value={profileUrl}
            disabled
            className="bg-gray-800 text-white rounded-lg p-2 flex-grow mr-2 focus:ring focus:ring-purple-500"
          />
          <Button onClick={copyToClipboard} className="bg-btn-gradient  hover:transform hover:scale-105 transition-transform hover:bg-opacity-90">
            Copy
          </Button>
        </div>
      </div>

      <div className="flex items-center bg-gray-900 bg-opacity-50 p-6 rounded-lg mb-6">
        <Switch
          {...register("acceptMessages")}
          checked={acceptMessages}
          onCheckedChange={handleSwitchChange}
          disabled={isSwitchLoading}
          className=" data-[state=checked]:bg-green-800 data-[state=unchecked]:bg-red-800   hover:transform hover:scale-105 transition-transform"
        />
        <span className="ml-3 text-sm font-medium">
          Accept Messages: {acceptMessages ? "On" : "Off"}
        </span>
      </div>

      <Separator className="my-6" />

      <Button
        className="bg-btn-gradient flex items-center justify-center mx-auto  hover:transform hover:scale-105 transition-transform hover:bg-opacity-90"
        onClick={() => fetchMessages(true)}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCcw className="h-4 w-4 mr-2" />
        )}
        Refresh Messages
      </Button>

      {/* Filter Dropdown */}
      <div className="mt-6 ">
        <select
          value={filter}
          onChange={handleFilterChange}
          className="bg-gray-800 text-white rounded-md p-2  hover:transform hover:scale-105 transition-transform"
        >
          <option value="all">All</option>
          <option value="feedback">Feedback</option>
          <option value="suggestion">Suggestion</option>
          <option value="appreciation">Appreciation</option>
        </select>
      </div>

      <div className="mt-8 text-center">
        <h2 className="text-xl font-bold">Total Messages Received:</h2>
        <CountUp
          from={0}
          to={filteredMessages.length}
          separator=","
          direction="up"
          duration={1}
          className="text-3xl font-extrabold"
        />
      </div>
      {isLoading || !session || !session.user ? (
    
      <div className="flex justify-center items-center h-screen bg-transparent">
        <HashLoader  color="#6993ff" size={50} />
        </div>
    ) : (
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((message) => (
            <MessageCard
              key={message._id as Key}
              message={message}
              onMessageDelete={handleDeleteMessage}
            />
          ))
        ) : (
          <p>No messages to display.</p>
        )}
      </div>
    )}
    </div>
  );
}

export default UserDashboard;
