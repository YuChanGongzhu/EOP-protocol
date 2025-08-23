document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chat-window');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const loadingIndicator = document.getElementById('loading-indicator');

    const API_BASE_URL = '/api';
    const CHAT_HISTORY_KEY = 'chatHistory';

    // 从localStorage加载聊天记录
    let conversationHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY)) || [];

    // 渲染历史记录
    const renderHistory = () => {
        chatWindow.innerHTML = '';
        conversationHistory.forEach(msg => appendMessage(msg.role, msg.content));
        scrollToBottom();
    };

    // 滚动到底部
    const scrollToBottom = () => {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    // 添加消息到窗口
    const appendMessage = (role, content) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', role);
        messageElement.textContent = content;
        chatWindow.appendChild(messageElement);
        scrollToBottom();
    };

    // 保存聊天记录到localStorage
    const saveHistory = () => {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(conversationHistory));
    };

    // 发送消息
    const sendMessage = async () => {
        const messageText = messageInput.value.trim();
        if (!messageText) return;

        // 1. 更新UI并保存用户消息
        appendMessage('user', messageText);
        conversationHistory.push({ role: 'user', content: messageText });
        saveHistory();
        messageInput.value = '';
        loadingIndicator.style.display = 'flex';

        try {
            // 2. 调用后端API
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 如果需要认证，在这里添加 'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ messages: conversationHistory }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '网络请求失败');
            }

            const aiReply = await response.text(); // 后端直接返回字符串

            // 3. 更新UI并保存AI回复
            appendMessage('assistant', aiReply);
            conversationHistory.push({ role: 'assistant', content: aiReply });
            saveHistory();

        } catch (error) {
            console.error('Error fetching AI reply:', error);
            appendMessage('assistant', `喵~ 抱歉，我遇到了一点问题: ${error.message}`);
        } finally {
            loadingIndicator.style.display = 'none';
        }
    };

    // 事件监听
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });

    // 初始化
    renderHistory();
});
