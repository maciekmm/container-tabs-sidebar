class Container {
    constructor(container, element) {
        this.container = container
        this.id = container.cookieStoreId
        this.element = element
        this.tabs = new Map()
    }

    init() {
        this._createElements()
        browser.tabs.onActivated.addListener((activeInfo) => {
            if(this.tabs.has(activeInfo.tabId)) {
                this.tabs.get(activeInfo.tabId).activate()
            }
        })
        browser.tabs.onCreated.addListener((newTab) => {
            if(newTab.cookieStoreId != this.id) return
            this.render(true)
        })
        browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
            if(removeInfo.isWindowClosing) return
            if(this.tabs.has(tabId)) {
                this.removeTab(tabId)
            }
        })
        browser.tabs.onMoved.addListener((tabId) => {
            if(this.tabs.has(tabId)) {
                this.render(true)
            }
        })
        this.collapsed = false
        this.render(true)
    }

    handleTabEvent(tab) {
        if(tab.cookieStoreId !== this.id) return
        this.render(true)
    }

    removeTab(tabId) {
        if(!this.tabs.has(tabId)) {
            throw new Exception("Cannot remove tab which does not belong to this container")
        }
        const tab = this.tabs.get(tabId)
        this.tabs.delete(tabId)
        tab.destroy()
        tab.element.parentNode.removeChild(tab.element)
    }

    _createElements() {
        this.elements = {}
        this.elements.containerHeader = document.createElement('div')

        this.elements.icon = document.createElement('img')
        this.elements.icon.className = 'container-icon'
        this.elements.containerHeader.appendChild(this.elements.icon)

        this.elements.title = document.createElement('span')
        this.elements.containerHeader.appendChild(this.elements.title)

        this.elements.actions = document.createElement('div')
        this.elements.actions.className = 'container-actions';
            this.elements.newTab = document.createElement('span')
            this.elements.newTab.href = '#'
            this.elements.newTab.className = 'container-action container-action--newtab'
            this.elements.newTab.innerText = '+'
            this.elements.newTab.addEventListener('click', (evt) => {
                evt.stopPropagation()
                this.newTab()
            })
            this.elements.actions.appendChild(this.elements.newTab)

            this.elements.collapse = document.createElement('span')
            this.elements.collapse.href = '#'
            this.elements.collapse.className = 'container-action container-action--collapse'
            this.elements.actions.appendChild(this.elements.collapse)
        this.elements.containerHeader.appendChild(this.elements.actions)

        this.element.appendChild(this.elements.containerHeader)

        this.elements.tabsContainer = document.createElement('ul')
        this.elements.tabsContainer.className = 'container-tabs'
        this.element.appendChild(this.elements.tabsContainer)

        this.elements.containerHeader.addEventListener('click', () => {
            this.collapsed = !this.collapsed
        })
    }

    newTab() {
        browser.tabs.create({
            cookieStoreId: this.id
        }).then(() => {
            this.collapsed = false
            this.render(true)
        }, (err) => {
            console.log(err)
        })
    }

    set collapsed(val) {
        this._collapsed = val
        if (val) {
            this.elements.collapse.innerText = '▴'
            this.element.classList.add('collapsed')
            return
        }
        this.elements.collapse.innerText = '▾'
        this.element.classList.remove('collapsed')
    }

    get collapsed() {
        return this._collapsed
    }

    refresh(container) {
        this.container = container
        this.render(false)
    }

    render(tabs) {
        const containerHeader = this.elements.containerHeader
        containerHeader.className = 'container-header'
        containerHeader.style.borderColor = this.container.colorCode

        this.elements.icon.src = this.container.iconUrl

        const titleElement = this.elements.title
        titleElement.className = 'container-title'
        titleElement.innerText = this.container.name

        if (tabs) {
            browser.tabs.query({
                currentWindow: true,
                cookieStoreId: this.container.cookieStoreId
            }).then((res) => {
                this.renderTabs(res)
            })
        }
    }

    renderTabs(tabs) {
        this.elements.tabsContainer.innerHTML = ''
        for (let firefoxTab of tabs) {
            const tabElement = document.createElement('li')
            tabElement.classList.add('container-tab')
            const tab = new ContainerTab(firefoxTab, tabElement)
            tabElement.setAttribute('data-tab-id', tab.id)
            this.tabs.set(tab.id, tab)
            this.elements.tabsContainer.appendChild(tabElement)
            tab.init()
        }
    }
}

class ContainerTab {
    constructor(tab, element) {
        this.tab = tab
        this.id = tab.id
        this.element = element
    }

    init() {
        this._createElements()
        this.render()
        browser.tabs.onUpdated.addListener((id, state, tab) => {
            this.tab = tab
            this.render()
        }, {
            tabId: this.id,
            properties: ["title", "favIconUrl"]
        })
    }

    destroy() {
        //browser.tabs.onUpdated.removeListener(this.listeners.update)
    }

    _createElements() {
        this.elements = {}
        this.elements.favicon = document.createElement('img')
        this.elements.favicon.className = 'favicon'
        this.element.appendChild(this.elements.favicon)

        this.elements.title = document.createElement('span')
        this.elements.title.className = 'container-tab-title'
        this.element.appendChild(this.elements.title)

        this.element.addEventListener("click", () => {
            browser.tabs.update(this.id, {
                active: true
            })
        })
    }

    activate() {
        this.tab.active = true
        this.render()
    }

    render() {
        this.elements.favicon.src = this.tab.favIconUrl
        this.elements.title.innerText = this.tab.title
        if(this.tab.active) {
            this.element.classList.add('tab-active')
        }
    }
}