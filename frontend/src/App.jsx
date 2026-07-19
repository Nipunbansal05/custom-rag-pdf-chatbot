import "./App.css";
import { useState, useEffect, useRef } from "react";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [message, setMessage] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSources, setShowSources] = useState({});
  const [darkMode, setDarkMode] = useState(false);

  const [chats, setChats] = useState([
    {
      id: 1,
      title: "New Chat",
      messages: [],
    },
  ]);

  const [activeChat, setActiveChat] = useState(1);

  const chatEndRef = useRef(null);

  useEffect(() => {
    const savedChats = localStorage.getItem("pdfChats");

    if (savedChats) {
      const parsedChats = JSON.parse(savedChats);

      if (parsedChats.length > 0) {
        setChats(parsedChats);
        setActiveChat(parsedChats[0].id);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pdfChats", JSON.stringify(chats));
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chats]);

 function handleFileChange(e) {
  const file = e.target.files[0];
  setFile(file);
}


function handleDrop(e) {
  e.preventDefault();

  setDragActive(false);

  const file = e.dataTransfer.files[0];

  if (file && file.type === "application/pdf") {
    setSelectedFile(file);
    setFileName(file.name);
  } else {
    alert("Please upload a PDF file only.");
  }
}

  async function handleUpload() {
    if (!selectedFile) {
      alert("Please select a PDF first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      setMessage(data.message);
      setPageCount(data.pages);
    } catch (error) {
      console.error(error);
      alert("Upload failed!");
    }
  }

  async function handleAsk() {
    if (!question.trim()) {
      alert("Please enter a question.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
        }),
      });

      const data = await response.json();

      const newMessage = {
        question,
        answer: data.answer,
        sources: data.sources || [],
      };

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id !== activeChat) return chat;

          return {
            ...chat,
            title:
              chat.messages.length === 0
                ? question.substring(0, 30)
                : chat.title,
            messages: [...chat.messages, newMessage],
          };
        })
      );

      setQuestion("");
    } catch (error) {
      console.error(error);
      alert("Failed to get AI response.");
    } finally {
      setLoading(false);
    }
  }
  async function handleRegenerate(questionText) {
  setQuestion(questionText);

  setLoading(true);

  try {
    const response = await fetch("http://127.0.0.1:8000/ask", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: questionText,
      }),
    });

    const data = await response.json();

    const newMessage = {
      question: questionText,
      answer: data.answer,
      sources: data.sources || [],
    };

    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id !== activeChat) return chat;

        return {
          ...chat,
          messages: [...chat.messages, newMessage],
        };
      })
    );

  } catch (error) {
    console.error(error);
    alert("Failed to regenerate answer.");
  } finally {
    setLoading(false);
  }
}
    function createNewChat() {
    const newChat = {
      id: Date.now(),
      title: "New Chat",
      messages: [],
    };

    setChats((prev) => [...prev, newChat]);
    setActiveChat(newChat.id);
    setQuestion("");
    setShowSources({});
  }

  function deleteChat(chatId) {

  if (chats.length === 1) {
    alert("At least one chat must remain.");
    return;
  }

  const updatedChats = chats.filter(
    (chat) => chat.id !== chatId
  );

  setChats(updatedChats);

  if (activeChat === chatId) {
    setActiveChat(updatedChats[0].id);
  }
}

  const currentChat =
    chats.find((chat) => chat.id === activeChat) || chats[0];

  return (
   <div className={darkMode ? "app dark" : "app"}>
      <div className="sidebar">
        <h2>🤖 AI PDF Chat</h2>

        <button
  className="theme-btn"
  onClick={() => setDarkMode(!darkMode)}
>
  {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
</button>

        <button
          className="new-chat-btn"
          onClick={createNewChat}
        >
          + New Chat
        </button>

        <hr />

        {chats.map((chat) => (
          <div
            key={chat.id}
            className="chat-item"
            onClick={() => setActiveChat(chat.id)}
            style={{
              background:
                activeChat === chat.id ? "#dbeafe" : "transparent",
              cursor: "pointer",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "6px",
            }}
          >
            <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  }}
>
  <span>💬 {chat.title}</span>

  <button
    onClick={(e) => {
      e.stopPropagation();
      deleteChat(chat.id);
    }}
    style={{
      background: "transparent",
      border: "none",
      cursor: "pointer",
      fontSize: "16px",
      color: "red",
    }}
  >
    🗑️
  </button>
</div>
          </div>
        ))}
      </div>

      <div className="container">
        <h1>🤖 AI PDF Chatbot</h1>

        <p>Upload a PDF and ask questions about it.</p>

        <div
  className={dragActive ? "drop-area active" : "drop-area"}
  onDragOver={(e) => {
    e.preventDefault();
    setDragActive(true);
  }}
  onDragLeave={() => setDragActive(false)}
  onDrop={handleDrop}
>
  📂 Drag & Drop PDF Here
  <br />
  <span>or click to select</span>

  <input
    type="file"
    accept=".pdf"
    onChange={handleFileChange}
    hidden
    id="pdfUpload"
  />

  <label htmlFor="pdfUpload">
    Choose PDF
  </label>
</div>

        <br />
        <br />

        <button onClick={handleUpload}>
          Upload PDF
        </button>

        <br />
        <br />

        {fileName && (
          <p>
            📄 <strong>Selected File:</strong> {fileName}
          </p>
        )}

        <h3>{message}</h3>

        <p>
          <strong>Total Pages:</strong> {pageCount}
        </p>

        <h2>Ask AI</h2>

        <input
          type="text"
          placeholder="Type your question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAsk();
            }
          }}
        />

        <br />
        <br />

        <button
          onClick={handleAsk}
          disabled={loading}
        >
          {loading ? "🤖 Thinking..." : "🚀 Ask AI"}
        </button>

        <br />
        <br />

        <h2>💬 Chat</h2>

        <div className="chat-container">

          {currentChat.messages.map((chat, index) => (

            <div key={index} className="chat-box">
              <div className="user-message">
                <strong>👤 You:</strong>
                <p>{chat.question}</p>
              </div>

              <div className="ai-message">
                <strong>🤖 AI:</strong>
                <p>{chat.answer}</p>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(chat.answer);
                    alert("✅ Answer copied!");
                  }}
                  style={{
                    marginTop: "10px",
                    marginRight: "10px",
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                >
                  📋 Copy
                </button>

                <button
                  onClick={() => handleRegenerate(chat.question)}
                  disabled={loading}
                  style={{
                    marginTop: "10px",
                    marginRight: "10px",
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                >
                  🔄 Regenerate
                </button>

                <button
                  onClick={() =>
                    setShowSources((prev) => ({
                      ...prev,
                      [index]: !prev[index],
                    }))
                  }
                  style={{
                    marginTop: "10px",
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                >
                  {showSources[index]
                    ? "🙈 Hide Source"
                    : "📄 Show Source"}
                </button>

                {showSources[index] &&
                  chat.sources.map((source, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#f4f4f4",
                        padding: "10px",
                        marginTop: "10px",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    >
                      {source}
                    </div>
                  ))}
              </div>
            </div>
          ))}

          <div ref={chatEndRef}></div>
        </div>
      </div>
    </div>
  );
}

export default App;