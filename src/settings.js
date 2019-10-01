const CTSOptions = {
    defaults: {
        theme: 'dark'
    },

    getSidebarAction: function () {
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
    },

    getConfig: function () {
        return new Promise((resolve, reject) => {
            browser.storage.local.get().then(c => {
                for (let key in this.defaults) {
                    if (!(key in c)) {
                        c[key] = this.defaults[key]
                    }
                }
                this.getSidebarAction().then(action => {
                    c['shortcut'] = action.shortcut
                    resolve(c)
                }, err => {
                    console.error('error occured while getting sidebar actions', err)
                    resolve(c)
                })
            })
        })
    }
}
