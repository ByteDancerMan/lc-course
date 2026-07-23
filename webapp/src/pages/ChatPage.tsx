import { useEffect } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { ChatView } from '@/components/ChatView'
import { MessageInput } from '@/components/MessageInput'
import { useAppStore } from '@/store/app-store'

export default function ChatPage() {
  const {
    sessions,
    activeSessionId,
    messages,
    streamingText,
    loading,
    sending,
    bootstrap,
    newSession,
    selectSession,
    deleteSession,
    sendMessage,
    stopStream,
  } = useAppStore()

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <LoaderCircle className="h-8 w-8 animate-spin text-[#10a37f]" />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={newSession}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <ChatView
          messages={messages}
          streamingText={streamingText}
          sending={sending}
        />
        <MessageInput
          onSend={sendMessage}
          onStop={stopStream}
          sending={sending}
        />
      </div>
    </div>
  )
}
