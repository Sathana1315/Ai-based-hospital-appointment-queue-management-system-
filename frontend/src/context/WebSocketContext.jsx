import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const WebSocketContext = createContext();

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ children }) => {
    const { token, user } = useAuth();
    const { showToast } = useToast();
    const [socket, setSocket] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);
    const reconnectTimeout = useRef(null);
    
    // We can track connected status if we want to show a UI indicator
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        let ws = null;
        
        const connect = () => {
            if (ws && ws.readyState !== WebSocket.CLOSED) return;

            // Determine WS URL based on environment or current window location
            let wsUrl = '';
            const envWs = import.meta.env.VITE_WS_URL;
            if (envWs && typeof envWs === 'string' && envWs.trim().length > 0) {
                wsUrl = `${envWs.trim().replace(/\/+$/, '')}${token ? `?token=${token}` : ''}`;
            } else {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                    ? '127.0.0.1:8000'
                    : window.location.host;
                wsUrl = `${protocol}//${host}/ws${token ? `?token=${token}` : ''}`;
            }
            
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setIsConnected(true);
                setSocket(ws);
                if (reconnectTimeout.current) {
                    clearTimeout(reconnectTimeout.current);
                    reconnectTimeout.current = null;
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                    
                    // Automatically show toast for new personal notifications
                    if (data.type === "NEW_NOTIFICATION" && data.notification) {
                        showToast(data.notification.title, data.notification.type);
                    }
                } catch (err) {
                    console.error("Error parsing websocket message", err);
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                setSocket(null);
                // Auto reconnect after 3 seconds
                reconnectTimeout.current = setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.error("WebSocket Error:", err);
                ws.close();
            };
        };

        connect();

        return () => {
            if (ws) {
                ws.close();
            }
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
        };
    }, [token, showToast]);

    return (
        <WebSocketContext.Provider value={{ socket, lastMessage, isConnected }}>
            {children}
        </WebSocketContext.Provider>
    );
};
