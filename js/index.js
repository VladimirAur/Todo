/////////////////////////////////////////////////////////////
//\\\\\\\\\\\\\\\\\//  HELPERS \\////////////////////////////
////////////////////////////////////////////////////////////
function createElement(tag, props, ...children) {
    const element = document.createElement(tag);

    Object.keys(props).forEach(key => {
        if (key.startsWith('data-')) {
            element.setAttribute(key, props[key]);
        } else {
            element[key] = props[key];
        }
    });

    children.forEach(child => {
        if (typeof child === 'string') {
            child = document.createTextNode(child);
        }

        element.appendChild(child);
    });

    return element;
}

class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(type, listener) {
        this.events[type] = this.events[type] || [];
        this.events[type].push(listener);
    }

    emit(type, arg) {
        if (this.events[type]) {
            this.events[type].forEach(listener => listener(arg));
        }
    }
}

function save(data) {
    const string = JSON.stringify(data);

    localStorage.setItem('todos', string);
}

function load() {
    const string = localStorage.getItem('todos');
    const data = JSON.parse(string);

    return data;
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

/////////////////////////////////////////////////////////////
//\\\\\\\\\\\\\\\\\\\\\//  MODEL  \\/////////////////////////
////////////////////////////////////////////////////////////
class Model extends EventEmitter {
    constructor(state = []) {
        super();
        
        this.state = state;//массив данных
    }
    // Метод получения элемента из массива данных
    getItem(id) {
        return this.state.find(item => item.id == id);// возвращает элемент по id
    }
    // Метод добавления элемента в массив данных
    addItem(item) {
        this.state.push(item);// добавляет элемент в массив
        this.emit('change', this.state);
        return item;// возвращает элемент
    }
    // Метод обновления элемента в массиве данных
    updateItem(id, data) {
        const item = this.getItem(id);// получает элемент по id

        Object.keys(data).forEach(prop => item[prop] = data[prop]);// заменяет все свойства элемента

        this.emit('change', this.state);
        
        return item;// возвращает элемент
    }
    // Метод удаления элемента из массива данных
    removeItem(id) {
        const index = this.state.findIndex(item => item.id == id);// получает индекс элемента
        
        if (index > -1) {
            this.state.splice(index, 1);// вырезает элемент по индексу
            this.emit('change', this.state);
        }
    }
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

/////////////////////////////////////////////////////////////
//\\\\\\\\\\\\\\\\\//  CONTROLLER \\////////////////////////
////////////////////////////////////////////////////////////
class Controller {
    constructor(model, view) {
        this.model = model;
        this.view = view;
        
        view.on('add', this.addTodo.bind(this));
        view.on('toggle', this.toggleTodo.bind(this));
        view.on('edit', this.editTodo.bind(this));
        view.on('remove', this.removeTodo.bind(this));

        view.show(model.state);
    }

    addTodo(title) {
        const item = this.model.addItem({
            id: Date.now(),
            title,
            completed: false
        });

        this.view.addItem(item);
    }

    toggleTodo({ id, completed }) {
        const item = this.model.updateItem(id, { completed });

        this.view.toggleItem(item);
    }

    editTodo({ id, title }) {
        const item = this.model.updateItem(id, { title });
        
        this.view.editItem(item);
    }

    removeTodo(id) {
        this.model.removeItem(id);
        this.view.removeItem(id);
    }
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

/////////////////////////////////////////////////////////////
//\\\\\\\\\\\\\\\\\//  VIEW \\//////////////////////////////
////////////////////////////////////////////////////////////
class View extends EventEmitter {
    constructor() {
        super();

        this.form = document.getElementById('todo-form');// Форма ввода задачи
        this.input = document.getElementById('add-input');// Инпут ввода задачи
        this.list = document.getElementById('todo-list');// Список задач

        this.form.addEventListener('submit', this.handleAdd.bind(this));
    }
    // Метод создания элементов задачи при помощи функции createElement
    createListItem(todo) {
        const checkbox = createElement('input', { type: 'checkbox', className: 'checkbox', checked: todo.completed ? 'checked' : '' });
        const label = createElement('label', { className: 'title' }, todo.title);
        const editInput = createElement('input', { type: 'text', className: 'textfield' });
        const editButton = createElement('button', { className: 'edit' }, 'Изменить');
        const deleteButton = createElement('button', { className: 'remove' }, 'Удалить');
        const item = createElement('li', { className: `todo-item${todo.completed ? ' completed': ''}`, 'data-id': todo.id },
         checkbox, label, editInput, editButton, deleteButton);

        return this.addEventListeners(item);// добавляет подписки на события
    }
    // Метод создания подписок на события
    addEventListeners(item) {
        const checkbox = item.querySelector('.checkbox');// получает доступ к DOM элементу по класу
        const editButton = item.querySelector('button.edit');// получает доступ к DOM элементу по класу
        const removeButton = item.querySelector('button.remove');// получает доступ к DOM элементу по класу

        checkbox.addEventListener('change', this.handleToggle.bind(this));// подписывается на событие
        editButton.addEventListener('click', this.handleEdit.bind(this));// подписывается на событие
        removeButton.addEventListener('click', this.handleRemove.bind(this));// подписывается на событие

        return item;
    }
    // Метод поиска задачи
    findListItem(id) {
        return this.list.querySelector(`[data-id="${id}"]`);
    }

    handleAdd(event) {
        event.preventDefault();

        if (!this.input.value) return alert('Необходимо ввести название задачи.');

        const value = this.input.value;

        this.emit('add', value);
    }
    
    handleToggle({ target }) {
        const listItem = target.parentNode;// получает доступ к задаче
        const id = listItem.getAttribute('data-id');// получает доступ к атрибуту
        const completed = target.checked;// проверяет значение чекбокса

        this.emit('toggle', { id, completed });
    }

    handleEdit({ target }) {
        const listItem = target.parentNode;
        const id = listItem.getAttribute('data-id');
        const label = listItem.querySelector('.title');
        const input = listItem.querySelector('.textfield');
        const editButton = listItem.querySelector('button.edit');
        const title = input.value;
        const isEditing = listItem.classList.contains('editing');

        if (isEditing) {
            this.emit('edit', { id, title });
        } else {
            input.value = label.textContent;
            editButton.textContent = 'Сохранить';
            listItem.classList.add('editing');
        }
    }

    handleRemove({ target }) {
        const listItem = target.parentNode;

        this.emit('remove', listItem.getAttribute('data-id'));
    }

    show(todos) {
        todos.forEach(todo => {
            const listItem = this.createListItem(todo);

            this.list.appendChild(listItem);
        });
    }
    // Метод добавления задачи из Формы в список
    addItem(todo) {
        const listItem = this.createListItem(todo);// создает задачу Методом создания эл. задачи

        this.input.value = '';// очищает Инпут 
        this.list.appendChild(listItem);// присваивает задачу Списку
    }
    // Метод для отметки задачи
    toggleItem(todo) {
        const listItem = this.findListItem(todo.id);// находит задачу Методом поиска задачи
        const checkbox = listItem.querySelector('.checkbox');// получает доступ к DOM элементу по класу

        checkbox.checked = todo.completed; // изменяет свойство

        if (todo.completed) {
            listItem.classList.add('completed');// добавляет класс
        } else {
            listItem.classList.remove('completed');// убирает класс
        }
    }
    // Метод изменения задачи
    editItem(todo) {
        const listItem = this.findListItem(todo.id);// находит задачу Методом поиска задачи
        const label = listItem.querySelector('.title');// получает доступ к DOM элементу по класу
        const input = listItem.querySelector('.textfield');// получает доступ к DOM элементу по класу
        const editButton = listItem.querySelector('button.edit');// получает доступ к DOM элементу по класу

        label.textContent = todo.title;// изменяет текст
        editButton.textContent = 'Изменить';// изменяет текст кнопки
        listItem.classList.remove('editing');// убирает клас
    }
    // Метод удаления задачи
    removeItem(id) {
        const listItem = this.findListItem(id);// находит задачу Методом поиска задачи

        this.list.removeChild(listItem);// удаляет из Списка
    }
}
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


const state = load();

const model = new Model(state || undefined);
model.on('change', state => save(state));

const view = new View();
const controller = new Controller(model, view);