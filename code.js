const editor = document.getElementById("editor")
const errorMessage = document.getElementById("error")
const preview = document.getElementById("preview")
const gutter = document.getElementById("gutter")

const elements = []
const errors = new Map()

const resetState = () => {
    elements.length = 0;
    errors.clear()
    errorMessage.innerHTML = ""
    gutter.innerHTML = ""
}

const renderGutter = () => {
    for (let i = 0; i < elements.length + 1; i++) {
        const line = document.createElement("p")
        if (errors.has(i)) {
            line.classList.add("error")
        }
        line.textContent = i
        gutter.appendChild(line)
    }
}

const appendListItems = (listItems) => {
    const list = document.createElement("ul")
    listItems.forEach(item => {
        const listItem = document.createElement("li")
        listItem.textContent = item;
        list.appendChild(listItem)
    })
    preview.appendChild(list);
    listItems.length = 0;
}

const appendParagraphs = (paragraphLines) => {
    const section = document.createElement("section")
    paragraphLines.forEach(line => {
        const paragraph = document.createElement("p")
        paragraph.textContent = line
        section.appendChild(paragraph)
    })
    preview.appendChild(section)
    paragraphLines.length = 0;
}

const renderElements = () => {
    const paragraphLines = []
    const listItems = []

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const type = element.type;

        if (type !== "paragraph" && paragraphLines.length) {
            appendParagraphs(paragraphLines);
        }
        if (type !== "listItem" && listItems.length) {
            appendListItems(listItems);
        }

        switch (type) {
            case "paragraph":
                paragraphLines.push(element.text)
                break;
            case "listItem":
                listItems.push(element.text);
                break
            case "header":
                const header = document.createElement("h" + element.level)
                header.textContent = element.text
                preview.appendChild(header)
                break
            case "seperator":
                preview.appendChild(document.createElement("br"));
                break;
            case "img":
                const img = document.createElement("img")
                img.src = element.link
                img.width = "200px;"
                preview.appendChild(img)
                break;
        }
    }

    if (paragraphLines.length) {
        appendParagraphs(paragraphLines)
    }
    if (listItems.length) {
        appendListItems(listItems)
    }
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

const debouncedRenderElements = debounce(() => {
    preview.textContent = ""
    renderElements()
}, 1000);


const parseText = (text) => {
    const lines = text.split("\n")

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith("#")) {
            addHeader(line, i)
        } else if (line.startsWith("*")) {
            addListItem(line, i);
        } else if (line.startsWith("![img]")) {
            addImage(line, i)
        } else if (isParagraphSeperator(line)) {
            addSeperator(i)
        } else {
            addParagraph(line, i)
        }
    };

    errors.entries().forEach((k, v) => {
        const [line, lineErrors] = k;
        lineErrors.forEach(error => {
            const errorText = `line: ${line}: ${error.reason}`
            const p = document.createElement("p")
            p.textContent = errorText;
            errorMessage.appendChild(p);
        })
    })
}

const isParagraphSeperator = (line) => line.trim().length === 0;

const addParagraph = (line, index) => {
    elements.push({
        type: "paragraph",
        index: index,
        text: line
    })
}

const addSeperator = (line) => {
    elements.push({
        type: "seperator",
        index: line
    })
}

const addImage = (text, line) => {
    const urlSection = text.substring("![img]".length, text.length)
    if (!urlSection.startsWith("(") || urlSection[urlSection.length - 1] !== ")") {
        const lineErrors = errors.get(line) ?? []
        lineErrors.push({
            reason: "Invalid img format, expected ![img](<url>)",
            line: line
        })
        errors.set(line, lineErrors)
    }
    const url = urlSection.substring(1, urlSection.length - 1);
    if (!url.startsWith("http")) {
        const lineErrors = errors.get(line) ?? []
        lineErrors.push({
            reason: "Only http src available",
            line: line
        })
        errors.set(line, lineErrors)
    }
    elements.push({
        type: "img",
        link: url,
        line: line
    })
}

const addHeader = (text, line) => {
    let headerSize = 0;
    for (let i = 0; i < text.length; i++) {
        if (!(text[i] === "#")) {
            break;
        }
        headerSize++;
    }
    if (headerSize < 1 || headerSize > 6) {
        const lineErrors = errors.get(line) ?? []
        lineErrors.push({
            reason: "Invalid header size: " + headerSize,
            line: line
        })
        errors.set(line, lineErrors)
    }
    const headerText = text.substring(headerSize, text.length)
    if (headerText) {
        elements.push({
            type: "header",
            level: headerSize,
            text: headerText
        })
    }
}

const addListItem = (text, line) => {
    const listText = text.substring(1, text.length)
    elements.push({
        type: "listItem",
        text: listText,
        line: line
    })
}

renderGutter()
editor.addEventListener('input', () => {
    resetState()
    parseText(editor.value)
    debouncedRenderElements()
    renderGutter();
})