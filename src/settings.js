const defaults = {
    theme: "dark",
}

export async function getSidebarAction() {
    return (await browser.commands.getAll()).filter(
        (e) => e.name === "_execute_sidebar_action"
    )[0]
}

export async function getConfig() {
    let cfg = await browser.storage.local.get()
    for (let key in defaults) {
        if (!(key in cfg)) {
            cfg[key] = defaults[key]
        }
    }
    let sidebarAction = await getSidebarAction()
    cfg["shortcut"] = sidebarAction.shortcut
    return cfg
}

var sessionStorage

function sessionProxyHandler(windowId, sessionStorage) {
    return {
        get: function (obj, key) {
            if (key == "isProxy") {
                return true
            }
            let val = obj[key]
            if (typeof val == "object" && !val.isProxy) {
                val = new Proxy(
                    val,
                    sessionProxyHandler(windowId, sessionStorage)
                )
            }
            return val
        },
        set: function (obj, key, value) {
            obj[key] = value
            browser.sessions.setWindowValue(
                windowId,
                "containers",
                proxyToPOJO(sessionStorage)
            )
            return true
        }.bind(this),
    }
}

function proxyToPOJO(proxy) {
    let res = {}
    for (let key of Object.keys(proxy)) {
        let val = proxy[key]
        if (typeof val == "object" && proxy[key].isProxy) {
            res[key] = proxyToPOJO(val)
        } else {
            res[key] = val
        }
    }
    return res
}

export async function getSessionStorage(window) {
    if (!!sessionStorage) {
        return sessionStorage
    }
    let storage = await browser.sessions.getWindowValue(window.id, "containers")
    if (!storage) {
        storage = {}
    }
    return (sessionStorage = new Proxy(
        storage,
        sessionProxyHandler(window.id, storage)
    ))
}
