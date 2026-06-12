importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCpKDmFtMF7VSeUqx0c4wMvnBWTP62TXs8",
  authDomain: "familyshop-d54da.firebaseapp.com",
  projectId: "familyshop-d54da",
  storageBucket: "familyshop-d54da.firebasestorage.app",
  messagingSenderId: "331402676242",
  appId: "1:331402676242:web:2b2bd56dfbc4d0fa9e70cb",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle =
    payload.notification?.title || "FamilyShop";

  const notificationOptions = {
    body: payload.notification?.body || "Новое уведомление",
    icon: "/window.svg",
    badge: "/window.svg",
    data: payload.data || {},
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow("/home")
  );
});