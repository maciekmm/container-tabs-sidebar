class ContextualIdentityContainer extends AbstractTabContainer {
    constructor(contextualIdentity, element) {
        super(element)
        this.contextualIdentity = contextualIdentity
        this.id = contextualIdentity.cookieStoreId
    }

    init() {
        this._createElements()
        super.init()
    }

    _handleTabActivated(tab) {
        this.collapsed = false
        super._handleTabActivated(tab)
    }

    _handleTabCreated(tab) {
        if(newTab.cookieStoreId !== this.id) return
        if(newTab.windowId !== ContainerTabsSidebar.WINDOW_ID) return
        this.render(true, () => {
            const renderedTab = this.tabs.get(newTab.id)
            if(renderedTab) {
                renderedTab.scrollIntoView()
            }
        })
    }

    _handleTabPinned(tabId, change, tab) {
        if(tab.pinned) {
            this.removeTab(tabId)
        } else {
            this.render(true)
        }
    }

    _createElements() {
        this.elements = {}
        this.elements.containerHeader = document.createElement('div')
        
        // favicon
        this.elements.icon = document.createElement('img')
        this.elements.icon.className = 'container-icon'
        this.elements.containerHeader.appendChild(this.elements.icon)

        // title
        this.elements.title = document.createElement('span')
        this.elements.containerHeader.appendChild(this.elements.title)

        // actions
        this.elements.actions = document.createElement('div')
        this.elements.actions.className = 'container-actions';

        // action-newtab
        this.elements.newTab = document.createElement('span')
        this.elements.newTab.href = '#'
        this.elements.newTab.className = 'container-action container-action--newtab'
        this.elements.newTab.innerText = '+'
        this.elements.newTab.addEventListener('click', (evt) => {
            evt.stopPropagation()
            this._actionNewTab()
        })
        this.elements.actions.appendChild(this.elements.newTab)

        // action-collapse
        this.elements.collapse = document.createElement('span')
        this.elements.collapse.href = '#'
        this.elements.collapse.className = 'container-action container-action--collapse'
        this.elements.actions.appendChild(this.elements.collapse)
        this.elements.containerHeader.appendChild(this.elements.actions)

        // add the whole header to parent element
        this.element.appendChild(this.elements.containerHeader)

        // list of tabs in container
        this.elements.tabsContainer = document.createElement('ul')
        this.elements.tabsContainer.className = 'container-tabs'
        this.element.appendChild(this.elements.tabsContainer)
        
        // collapse/show
        this.elements.containerHeader.addEventListener('click', () => {
            this.collapsed = !this.collapsed
        })
    }

    _actionNewTab() {
        browser.tabs.create({
            cookieStoreId: this.id
        }).then(() => {
            this.collapsed = false
        })
    }

    set collapsed(val) {
        this._collapsed = val
        this.render(false)
    }

    get collapsed() {
        return this._collapsed
    }

    refresh(contextualIdentity) {
        this.contextualIdentity = contextualIdentity
        this.render(false)
    }

    render(updateTabs, callback) {
        // styling (border according to container config)
        const containerHeader = this.elements.containerHeader
        containerHeader.className = 'container-header'
        containerHeader.style.borderColor = this.contextualIdentity.colorCode

        // favicon
        this.elements.icon.src = this.contextualIdentity.iconUrl

        // title
        const titleElement = this.elements.title
        titleElement.className = 'container-title'
        titleElement.innerText = this.contextualIdentity.name + ' ('+this.tabs.size+')'

        // collapse
        this.elements.collapse.innerText = (this._collapsed ? '▴' : '▾')
        if(this._collapsed) {
            this.element.classList.add('collapsed')
        } else {
            this.element.classList.remove('collapsed')
        }

        if (updateTabs) {
            browser.tabs.query({
                currentWindow: true,
                cookieStoreId: this.id,
                pinned: false
            }).then((res) => {
                this.renderTabs(res)
                this.render(false, callback)
            })
        } else {
            if(callback) {
                callback()
            }
        }
    }

    renderTabs(tabs) {
        this.elements.tabsContainer.innerHTML = ''
        this.tabs.clear()

        for (let firefoxTab of tabs) {
            const tabElement = document.createElement('li')
            tabElement.classList.add('container-tab')
            tabElement.setAttribute('data-tab-id', firefoxTab.id)

            const tab = new ContainerTab(firefoxTab, tabElement)
            this.tabs.set(tab.id, tab)
            tab.init()

            this.elements.tabsContainer.appendChild(tabElement)
        }
    }
}