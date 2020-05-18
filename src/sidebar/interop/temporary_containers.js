async function sendMessage(message) {
    return await browser.runtime.sendMessage('{c607c8df-14a7-4f28-894f-29e8722976af}', message);
}

export async function isTemporaryContainer(cookieStoreId) {
    try {
        return await sendMessage({ method: 'isTempContainer', cookieStoreId: cookieStoreId })
    } catch (e) {
        return false
    }
}

export async function openTabInTemporaryContainer(url) {
    try {
        return await sendMessage({ method: 'createTabInTempContainer', url: url, active: true })
    } catch (e) {
        return undefined
    }
}

export async function isInstalled() {
    try {
        await sendMessage({method: 'isTempContainer'})
        return true
    } catch (e) {
        return false
    }
}