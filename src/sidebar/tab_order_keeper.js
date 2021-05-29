import { isTemporaryContainer } from "./interop/temporary_containers.js"

var tid
function scheduleSortTabs() {
    if (!!tid) clearTimeout(tid)
    tid = setTimeout(sortTabs, 200)
}

async function getDesiredTabsOrder() {
    let tabs = await browser.tabs.query({ currentWindow: true, pinned: false })
    let contextualIdentities = await Promise.all(
        (
            await browser.contextualIdentities.query({})
        ).map(async (ctx, index) => {
            const cookieStoreId = ctx.cookieStoreId
            // temporary containers are treated visually as a single container but report different cookieStoreIds
            // this will treat them as a single one
            const desiredOrder = (await isTemporaryContainer(cookieStoreId))
                ? Number.MAX_SAFE_INTEGER
                : index + 1

            return {
                cookieStoreId: cookieStoreId,
                order: desiredOrder,
            }
        })
    )

    let getDesiredContextualIdentityPosition = (cookieStoreId) => {
        const containerInformation = contextualIdentities.find(
            (ci) => ci.cookieStoreId === cookieStoreId
        )
        if (!containerInformation) {
            return 0
        }
        return containerInformation.order
    }

    let comparator = (tab1, tab2) => {
        let tab1ContainerOrder = getDesiredContextualIdentityPosition(
            tab1.cookieStoreId
        )
        let tab2ContainerOrder = getDesiredContextualIdentityPosition(
            tab2.cookieStoreId
        )
        if (tab1ContainerOrder !== tab2ContainerOrder) {
            return tab1ContainerOrder - tab2ContainerOrder
        }
        return tab1.index - tab2.index
    }

    let sorted = tabs
        .slice(1)
        .every((item, i) => comparator(tabs[i], item) <= 0)
    if (!sorted) {
        tabs.sort(comparator)
    }
    return { tabs: tabs, sorted: sorted }
}

async function sortTabs() {
    let { tabs, sorted } = await getDesiredTabsOrder()
    if (sorted) return
    await browser.tabs.move(
        tabs.map((tab) => tab.id),
        { index: -1 }
    )
}

export function enable() {
    browser.tabs.onCreated.addListener(scheduleSortTabs)
    browser.tabs.onMoved.addListener(scheduleSortTabs)
    browser.tabs.onAttached.addListener(scheduleSortTabs)

    sortTabs()
}
