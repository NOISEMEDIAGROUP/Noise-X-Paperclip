import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader, Send, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  content: string;
  direction: "inbound" | "outbound";
  senderName?: string;
  senderIdentifier: string;
  status: string;
  createdAt: string;
}

interface MessageChatProps {
  agentId: string;
  channelId: string;
  connectorId: string;
  channelName: string;
  platformIcon?: string;
}

export function MessageChat({
  agentId,
  channelId,
  connectorId,
  channelName,
  platformIcon = "💬",
}: MessageChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages
  useEffect(() => {
    loadMessages();

    if (autoRefresh) {
      const interval = setInterval(loadMessages, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [agentId, channelId, autoRefresh]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await fetch(
        `/api/agents/${agentId}/messaging/channels/${channelId}/messages?limit=50`
      );
      if (!response.ok) throw new Error("Failed to load messages");
      const data = await response.json();
      setMessages(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const response = await fetch(
        `/api/agents/${agentId}/messaging/channels/${channelId}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connectorId,
            content: newMessage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setNewMessage("");
      loadMessages(); // Refresh to show new message
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const getMessageStyle = (direction: string) => {
    return direction === "outbound"
      ? "bg-blue-100 text-blue-900 ml-auto mr-0"
      : "bg-gray-100 text-gray-900 ml-0 mr-auto";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
      case "delivered":
        return "✓";
      case "read":
        return "✓✓";
      case "failed":
        return "✗";
      default:
        return "○";
    }
  };

  if (loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardContent className="flex items-center justify-center py-8 flex-1">
          <Loader className="w-6 h-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{platformIcon}</span>
            <CardTitle>{channelName}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "text-green-600" : "text-gray-600"}
          >
            {autoRefresh ? "● Live" : "○ Manual"}
          </Button>
        </div>
      </CardHeader>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 m-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Messages Container */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.direction === "outbound" ? "items-end" : "items-start"}`}
            >
              <div className={`max-w-xs px-4 py-2 rounded-lg ${getMessageStyle(msg.direction)}`}>
                {msg.senderName && msg.direction === "inbound" && (
                  <p className="text-xs font-semibold opacity-70 mb-1">{msg.senderName}</p>
                )}
                <p className="break-words">{msg.content}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(msg.createdAt).toLocaleTimeString()} {getStatusIcon(msg.status)}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Message Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={sending || !newMessage.trim()} size="sm">
            {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </Card>
  );
}
