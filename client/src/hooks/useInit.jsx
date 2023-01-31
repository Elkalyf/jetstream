import { useEffect } from "react";
import useSocket from "./socketHooks/useSocket";
import { useSelector, useDispatch } from "react-redux";
import { contactsActions } from "../store/contactsSlice";
import useFetch from "./useFetch";
import { chatActions } from "../store/chatSlice";

const useInit = () => {
  // useSocketHook
  const { socketEmit, socketListen, userId, socket } = useSocket();

  // Set app theme
  useEffect(() => {
    const initialMode = JSON.parse(localStorage.getItem("darkMode"));
    document
      .querySelector("html")
      .setAttribute("class", initialMode ? "dark" : "null");
  }, []);

  // Get logged in state
  const loggedIn = useSelector((state) => state.authReducer.loggedIn);

  const dispatch = useDispatch();

  // Fetch user contacts
  const { reqFn: fetchContacts } = useFetch(
    { method: "GET", url: "/contacts" },
    (data) => {
      dispatch(contactsActions.setContacts(data.data.contacts));
    }
  );

  // Moment user logs in, fetch contacts
  useEffect(() => {
    if (loggedIn) {
      fetchContacts();
    }
  }, [loggedIn]);

  // On getting user details
  useEffect(() => {
    if (userId) {
      // Connect socket if disconnected
      if (socket.disconnected) {
        socket.connect();
      }
      // Announce logged in status
      socketEmit("user:online", userId);

      // Listen to online event from other users
      socketListen("user:online", (userId) => {
        const payload = {
          id: userId,
          status: {
            online: true,
          },
        };
        // Set contact online status
        dispatch(contactsActions.setContactOnlineStatus(payload));
        // Set chatroom online status
        dispatch(chatActions.updateChatProfile({ payload }));
      });

      // Listen to offline event from other users
      socketListen("user:offline", ({ userId, time }) => {
        const payload = {
          id: userId,
          status: {
            online: false,
            lastSeen: time,
          },
        };

        dispatch(contactsActions.setContactOnlineStatus(payload));
        dispatch(chatActions.updateChatProfile({ payload }));
      });
    }
  }, [userId]);

  return {
    loggedIn,
  };
};

export default useInit;