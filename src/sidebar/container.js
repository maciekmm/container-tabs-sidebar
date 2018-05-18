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
            if(activeInfo.windowId !== ContainerTabsSidebar.WINDOW_ID) return
            if(this.tabs.has(activeInfo.tabId)) {
                this.collapsed = false
                this.tabs.get(activeInfo.tabId).activate()
            }
        })
        browser.tabs.onCreated.addListener((newTab) => {
            if(newTab.cookieStoreId !== this.id) return
            if(newTab.windowId !== ContainerTabsSidebar.WINDOW_ID) return
            this.render(true)
        })
        browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
            if(removeInfo.isWindowClosing) return
            if(removeInfo.windowId !== ContainerTabsSidebar.WINDOW_ID) return
            if(this.tabs.has(tabId)) {
                this.removeTab(tabId)
                this.render(false)
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
        titleElement.innerText = this.container.name + ' ('+this.tabs.size+')'

        if (tabs) {
            browser.tabs.query({
                currentWindow: true,
                cookieStoreId: this.container.cookieStoreId
            }).then((res) => {
                this.renderTabs(res)
                this.render(false)
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