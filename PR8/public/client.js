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

// 1. ПРИНУДИТЕЛЬНЫЙ ПЕРЕНОС СТРОКИ
// Перехватываем нажатие Enter, чтобы вставлять <br> вместо создания <div>
editor.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        // Вставляем перенос строки (<br>)
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

    if (data.contentData && data.contentData.length > 0) {
        renderContent(data.contentData);
    }

    lastText = getPlainText();
    updateUsersList(data.users);
    console.log('Подключен:', currentUser.name, 'Цвет:', currentUser.color);
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
    var contentData = extractContentData();
    renderContent(contentData);
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

function handleInput() {
    var contentData = extractContentData();
    var text = getPlainText();
    
    // Отправляем только если текст реально изменился
    if (text !== lastText) {
        socket.emit('textChange', {
            content: text,
            contentData: contentData
        });
        lastText = text;
        updateLastActivity('Вы печатаете...');
    }
}

function getPlainText() {
    return editor.innerText || '';
}

function extractContentData() {
    var data = [];
    var timestamp = Date.now();
    
    function process(node) {
        if (node.nodeType === 3) { // Текстовый узел
            var text = node.textContent;
            for (var i = 0; i < text.length; i++) {
                data.push({ 
                    char: text[i], 
                    userId: currentUser.id, 
                    timestamp: timestamp 
                });
            }
        } else if (node.nodeType === 1) { // Элемент
            var userId = node.dataset.userId || currentUser.id;
            var ts = parseInt(node.dataset.timestamp) || timestamp;
            
            for (var i = 0; i < node.childNodes.length; i++) {
                var child = node.childNodes[i];
                
                if (child.nodeName === 'BR') {
                    data.push({ 
                        char: '\n', 
                        userId: userId, 
                        timestamp: ts 
                    });
                } else if (['DIV', 'P'].includes(child.nodeName)) {
                    // Если браузер все же создал блок (DIV/P), считаем это переносом строки
                    // Добавляем \n перед содержимым блока, если это не самый начало
                    if (data.length > 0 && data[data.length - 1].char !== '\n') {
                         data.push({ char: '\n', userId: userId, timestamp: ts });
                    }
                    process(child);
                } else {
                    process(child);
                }
            }
        }
    }

    for (var i = 0; i < editor.childNodes.length; i++) {
        process(editor.childNodes[i]);
    }

    return data;
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
                html += '<span class="char" data-user-id="' + currentUserId + '" style="' + bg + '">' + escapeHtml(buffer) + '</span><br>';
                buffer = '';
            } else {
                html += '<br>';
            }
            currentUserId = null;
        } else {
            // 2. ИСПРАВЛЕНИЕ СИНТАКСИСА (& & -> &&) И ОПЕЧАТКИ (colo r -> color)
            if (currentUserId !== item.userId && buffer) {
                var user = usersMap.get(currentUserId);
                var color = user ? user.color : '#999';
                var bg = highlightMode ? 'background-color: ' + color + '40' : '';
                html += '<span class="char" data-user-id="' + currentUserId + '" style="' + bg + '">' + escapeHtml(buffer) + '</span>';
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
        html += '<span class="char" data-user-id="' + currentUserId + '" style="' + bg + '">' + escapeHtml(buffer) + '</span>';
    }

    // Сохраняем позицию курсора перед перерисовкой
    var cursorPos = saveCursor();
    editor.innerHTML = html;
    // Пытаемся восстановить курсор
    restoreCursor(cursorPos);
}

socket.on('textChange', function(data) {
    // Если изменение от другого пользователя
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
            renderContent(data.contentData);
        } else if (data.content) {
            var contentData = [];
            for (var i = 0; i < data.content.length; i++) {
                contentData.push({
                    char: data.content[i],
                    userId: data.userId,
                    timestamp: data.timestamp || Date.now()
                });
            }
            renderContent(contentData);
        }

        restoreCursor(cursorPos);
        lastText = getPlainText();
        updateLastActivity('Изменения от ' + (data.userName || 'пользователя'));

        // Визуальный эффект обновления
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
    var preRange = range.cloneRange();
    preRange.selectNodeContents(editor);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
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
        } else {
            for (var i = 0; i < node.childNodes.length; i++) {
                traverse(node.childNodes[i]);
            }
        }
    }

    traverse(editor);
    if (found) {
        sel.removeAllRanges();
        sel.addRange(range);
    }
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
    chip.innerHTML = '<div class="user-dot" style="background:' + user.color + '"></div>' + user.name + '';
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