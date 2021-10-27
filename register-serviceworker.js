if('serviceWorker' in navigator) {
    let registration;

    const registerServiceWorker = async () => {
        registration = await navigator.serviceWorker.register('sw.js');
        console.log(`Service Worker Registration (Scope: ${registration.scope})`);
    };

    registerServiceWorker();
}