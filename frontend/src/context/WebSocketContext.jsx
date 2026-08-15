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

            // Determine WS URL based on current window location
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // Use environment variable if available, else fallback to standard port
            const wsUrl = `${protocol}//localhost:8000/ws${token ? `?token=${token}` : ''}`;
            
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
