const socket = io();
const editor = document.getElementById('editor');
const currentUserEl = document.getElementById('currentUser');
const usersListEl = document.getElementById('usersList');
const usersCountEl = document.getElementById('usersCount');
const lastUpdateEl = document.getElementById('lastUpdate');
const connectionStatusEl = document.getElementById('connectionStatus');
const toggleHighlightBtn = document.getElementById('toggleHighlight');

let currentUser = null;
let highlightMode = true;
let usersMap = new Map();
let isComposing = false;
let lastText = '';
let localContentData = [];

editor.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.execCommand('insertLineBreak');
    }
});

socket.on('init', function(data) {
    currentUser = data.currentUser;
    currentUserEl.textContent = currentUser.name;
    currentUserEl.style.backgroundColor = currentUser.color;
    
    usersMap.clear();
    data.users.forEach(function(user) {
        usersMap.set(user.id, user);
    });

    localContentData = data.contentData || [];
    if (localContentData.length > 0) {
        renderContent(localContentData);
    }

    lastText = getTextFromData(localContentData);
    updateUsersList(data.users);
});

toggleHighlightBtn.addEventListener('click', function() {
    highlightMode = !highlightMode;
    if (highlightMode) {
        toggleHighlightBtn.classList.add('btn-active');
        toggleHighlightBtn.querySelector('.btn-status').textContent = 'ВКЛ';
    } else {
        toggleHighlightBtn.classList.remove('btn-active');
        toggleHighlightBtn.querySelector('.btn-status').textContent = 'ВЫКЛ';
    }
    let cursorPos = saveCursor();
    renderContent(localContentData);
    restoreCursor(cursorPos);
});

editor.addEventListener('input', function() {
    if (isComposing) return;
    handleInput();
});

editor.addEventListener('compositionstart', function() {
    isComposing = true;
});

editor.addEventListener('compositionend', function() {
    isComposing = false;
    handleInput();
});

// ХЕЛПЕРЫ ДЛЯ РАБОТЫ С ТЕКСТОМ И СОСТОЯНИЕМ
function getTextFromData(dataArray) {
    return dataArray.map(item => item.char).join('');
}

function getCleanText(el) {
    let text = '';
    for (let i = 0; i < el.childNodes.length; i++) {
        let node = el.childNodes[i];
        if (node.nodeType === 3) { 
            text += node.textContent;
        } else if (node.nodeName === 'BR') {
            text += '\n';
        } else if (node.nodeType === 1) {
            if (['DIV', 'P'].includes(node.nodeName) && text.length > 0 && text[text.length-1] !== '\n') {
                 text += '\n';
            }
            text += getCleanText(node);
        }
    }
    return text;
}

function handleInput() {
    let newText = getCleanText(editor);
    if (newText === lastText) return;

    let i = 0;
    while (i < lastText.length && i < newText.length && lastText[i] === newText[i]) i++;

    let j = 0;
    while (i + j < lastText.length && i + j < newText.length && 
           lastText[lastText.length - 1 - j] === newText[newText.length - 1 - j]) j++;

    let removedCount = lastText.length - i - j;
    let addedStr = newText.substring(i, newText.length - j);

    localContentData.splice(i, removedCount);

    let newItems = [];
    let ts = Date.now();
    for (let k = 0; k < addedStr.length; k++) {
        newItems.push({ char: addedStr[k], userId: currentUser.id, timestamp: ts });
    }
    
    localContentData.splice(i, 0, ...newItems);
    lastText = newText;

    socket.emit('textChange', {
        content: newText,
        contentData: localContentData
    });

    updateLastActivity('Вы печатаете...');

    let cursorPos = saveCursor();
    renderContent(localContentData);
    restoreCursor(cursorPos);
}

function renderContent(contentData) {
    if (!contentData || contentData.length === 0) {
        editor.innerHTML = '';
        return;
    }
    
    var html = '';
    var currentUserId = null;
    var buffer = '';

    for (var i = 0; i < contentData.length; i++) {
        var item = contentData[i];
        
        if (item.char === '\n') {
            if (buffer) {
                var user = usersMap.get(currentUserId);
                var color = user ? user.color : '#999';
                var bg = highlightMode ? 'background-color: ' + color + '40' : '';
                html += `<span class="char" data-user-id="${currentUserId}" style="${bg}">${escapeHtml(buffer)}</span>`;
                buffer = '';
            }
            html += '<br>';
            currentUserId = null;
        } else {
            if (currentUserId !== item.userId && buffer) {
                var user = usersMap.get(currentUserId);
                var color = user ? user.color : '#999';
                var bg = highlightMode ? 'background-color: ' + color + '40' : '';
                html += `<span class="char" data-user-id="${currentUserId}" style="${bg}">${escapeHtml(buffer)}</span>`;
                buffer = '';
            }
            currentUserId = item.userId;
            buffer += item.char;
        }
    }

    if (buffer) {
        var user = usersMap.get(currentUserId);
        var color = user ? user.color : '#999';
        var bg = highlightMode ? 'background-color: ' + color + '40' : '';
        html += `<span class="char" data-user-id="${currentUserId}" style="${bg}">${escapeHtml(buffer)}</span>`;
    }

    editor.innerHTML = html;
}

socket.on('textChange', function(data) {
    if (data.userId !== currentUser.id) {
        if (data.userName && data.userColor && !usersMap.has(data.userId)) {
            usersMap.set(data.userId, {
                id: data.userId,
                name: data.userName,
                color: data.userColor
            });
            addUserToPanel(usersMap.get(data.userId));
        }
        
        var cursorPos = saveCursor();

        if (data.contentData && data.contentData.length > 0) {
            localContentData = data.contentData;
            renderContent(localContentData);
        }

        restoreCursor(cursorPos);
        lastText = getTextFromData(localContentData);
        updateLastActivity('Изменения от ' + (data.userName || 'пользователя'));

        editor.style.backgroundColor = 'rgba(102,126,234,0.05)';
        setTimeout(function() {
            editor.style.backgroundColor = '';
        }, 300);
    }
});

function saveCursor() {
    var sel = window.getSelection();
    if (!sel.rangeCount) return 0;
    var range = sel.getRangeAt(0);

    var length = 0;
    var found = false;

    function traverse(node) {
        if (found) return;
        if (node === range.startContainer) {
            if (node.nodeType === 3) {
                length += range.startOffset;
            } else {
                for (var i = 0; i < range.startOffset; i++) {
                    var child = node.childNodes[i];
                    if (child.nodeType === 3) length += child.length;
                    else if (child.nodeName === 'BR') length += 1;
                    else length += child.textContent.length;
                }
            }
            found = true;
            return;
        }
        
        if (node.nodeType === 3) {
            length += node.length;
        } else if (node.nodeName === 'BR') {
            length += 1;
        } else {
            for (var i = 0; i < node.childNodes.length; i++) {
                traverse(node.childNodes[i]);
            }
        }
    }

    traverse(editor);
    return length;
}

function restoreCursor(pos) {
    var sel = window.getSelection();
    var range = document.createRange();
    var current = 0;
    var found = false;

    function traverse(node) {
        if (found) return;
        
        if (node.nodeType === 3) {
            var next = current + node.length;
            if (pos >= current && pos <= next) {
                range.setStart(node, pos - current);
                range.collapse(true);
                found = true;
                return;
            }
            current = next;
        } else if (node.nodeName === 'BR') {
            var next = current + 1;
            if (pos === next) {
                range.setStartAfter(node);
                range.collapse(true);
                found = true;
                return;
            }
            current = next;
        } else {
            for (var i = 0; i < node.childNodes.length; i++) {
                traverse(node.childNodes[i]);
            }
        }
    }

    traverse(editor);

    if (!found) {
        range.selectNodeContents(editor);
        range.collapse(false);
    }

    sel.removeAllRanges();
    sel.addRange(range);
}

socket.on('userJoined', function(user) {
    usersMap.set(user.id, user);
    addUserToPanel(user);
    updateLastActivity(user.name + ' присоединился');
});

socket.on('userLeft', function(data) {
    usersMap.delete(data.userId);
    removeUserFromPanel(data.userId);
    updateLastActivity(data.userName + ' покинул чат');
});

socket.on('connect', function() {
    connectionStatusEl.textContent = 'Подключено';
    connectionStatusEl.className = 'status-connected';
});

socket.on('disconnect', function() {
    connectionStatusEl.textContent = 'Отключено';
    connectionStatusEl.className = 'status-disconnected';
});

function updateUsersList(users) {
    usersListEl.innerHTML = '';
    users.forEach(function(user) {
        addUserToPanel(user);
    });
    usersCountEl.textContent = users.length;
}

function addUserToPanel(user) {
    if (document.getElementById('user-' + user.id)) return;
    var chip = document.createElement('div');
    chip.className = 'user-chip';
    chip.id = 'user-' + user.id;
    chip.innerHTML = '<div class="user-dot" style="background:' + user.color + '"></div>' + user.name;
    usersListEl.appendChild(chip);
    usersCountEl.textContent = usersListEl.children.length;
}

function removeUserFromPanel(userId) {
    var el = document.getElementById('user-' + userId);
    if (el) {
        el.remove();
        usersCountEl.textContent = usersListEl.children.length;
    }
}

function updateLastActivity(msg) {
    lastUpdateEl.textContent = msg;
    setTimeout(function() {
        if (lastUpdateEl.textContent === msg) {
            lastUpdateEl.textContent = 'Синхронизировано';
        }
    }, 2000);
}

function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.addEventListener('beforeunload', function(e) {
    if (getPlainText() !== lastText) {
        e.preventDefault();
        e.returnValue = '';
    }
});