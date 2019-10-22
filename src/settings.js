const defaults = {
    theme: 'dark'
}

export function getSidebarAction() {
    return new Promise((resolve, reject) => {
        browser.commands.getAll().then(cmds => {
            let filtered = cmds.filter(e => e.name === "_execute_sidebar_action")
            if (filtered.length == 1) {
                resolve(filtered[0])
                return
            }
            reject('no actions found')
        })
    })
}

export function getConfig() {
    return new Promise((resolve, reject) => {
        browser.storage.local.get().then(c => {
            for (let key in defaults) {
                if (!(key in c)) {
                    c[key] = defaults[key]
                }
            }
            getSidebarAction().then(action => {
                c['shortcut'] = action.shortcut
                resolve(c)
            }, err => {
                console.error('error occured while getting sidebar actions', err)
                resolve(c)
            })
        })
    })
}

var sessionStorage;

function sessionProxyHandler(windowId, sessionStorage) {
    return {
        get: function (obj, key) {
            if (key == 'isProxy') {
                return true
            }
            let val = obj[key]
            if (typeof val == 'object' && !val.isProxy) {
                val = new Proxy(val, sessionProxyHandler(windowId, sessionStorage))
            }
            return val
        },
        set: function (obj, key, value) {
            obj[key] = value
            browser.sessions.setWindowValue(windowId, 'containers', proxyToPOJO(sessionStorage))
            return true
        }.bind(this)
    }
}

function proxyToPOJO(proxy) {
    let res = {}
    for (let key of Object.keys(proxy)) {
        let val = proxy[key]
        if (typeof val == 'object' && proxy[key].isProxy) {
            res[key] = proxyToPOJO(val)
        } else {
            res[key] = val
        }
    }
    return res
}

export async function getSessionStorage(window) {
    if (!!sessionStorage) {
        console.log("test")
        return sessionStorage
    }
    let storage = await browser.sessions.getWindowValue(window.id, 'containers')
    if (!storage) {
        storage = {}
    }
    return sessionStorage = new Proxy(storage, sessionProxyHandler(window.id, storage))
}