const form = document.querySelector("#userForm");
const message = document.querySelector("#message");
const userList = document.querySelector("#userList");
const searchInput = document.querySelector("#searchInput");

let allUsers = [];
const usersHeading = document.querySelector("#users");
const userCount = document.querySelector("#userCount");
const editModal = document.querySelector("#editModal");
const closeModal = document.querySelector("#closeModal");
const deleteModal = document.querySelector("#deleteModal");
const deleteMessage = document.querySelector("#deleteMessage");
const confirmDelete = document.querySelector("#confirmDelete");
const cancelDelete = document.querySelector("#cancelDelete");
const closeDeleteModal = document.querySelector("#closeDeleteModal");

const editForm = document.querySelector("#editForm");
const editId = document.querySelector("#editId");
const editName = document.querySelector("#editName");
const editEmail = document.querySelector("#editEmail");
const cancelEdit = document.querySelector("#cancelEdit");
const editRole = document.querySelector("#editRole");

function showMessage(text) {
    message.textContent = text;
    message.style.display = "block";

    setTimeout(function () {
        message.style.display = "none";
    }, 5000);
}

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.querySelector("#name").value;
    const email = document.querySelector("#email").value;

    try {
        const response = await fetch("http://127.0.0.1:8000/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: name,
                email: email
            })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage("User created successfully!");
            
            form.reset();
            loadUsers();

        } else {
            showMessage(data.detail);
        }

    } catch (error) {
        showMessage("Could not connect to the server.");
    }
});

async function loadUsers() {
    try {
        const response = await fetch("http://127.0.0.1:8000/users");

        const users = await response.json();

        allUsers = users.sort(function (a, b) {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
        usersHeading.textContent = `Users (${users.length})`;

        if (users.length === 0) {
            userList.innerHTML = "";
            userList.textContent = "No users yet. Create your first user above.";
            userList.classList.add("empty-message");
            return;
        }

        userList.classList.remove("empty-message");

        displayUsers(users);

    } catch (error) {
        userList.textContent = "Could not load users.";
    }
}

function displayUsers(users) {

    userList.innerHTML = "";

    users.forEach(function (user) {

        const listItem = document.createElement("li");

        const avatar = document.createElement("div");

        avatar.classList.add("avatar");

        avatar.textContent =
            user.name.substring(0, 1).toUpperCase() +
            user.name.substring(1, 2).toLowerCase();        
        
    const userInfo = document.createElement("div");
    
    userInfo.classList.add("user-info");

    userInfo.innerHTML = `
        <strong>${user.name}</strong><br>
        ${user.email}<br>
        <span class="role-badge">${user.role}</span><br>
        <small>
            Created: ${
                user.created_at
                    ? new Date(user.created_at).toLocaleString()
                    : "Date unavailable"
            }
        </small>
    `;

        const editButton = document.createElement("button");

        editButton.textContent = "Edit";

        editButton.addEventListener("click", function () {

            editId.value = user.id;
            editName.value = user.name;
            editEmail.value = user.email;

            editModal.style.display = "flex";
        });


        const deleteButton = document.createElement("button");

        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", function () {

            deleteMessage.textContent =
                `Are you sure you want to delete ${user.name}?`;

            deleteModal.style.display = "flex";

            confirmDelete.onclick = async function () {

                await fetch(`http://127.0.0.1:8000/users/${user.id}`, {
                    method: "DELETE"
                });

                deleteModal.style.display = "none";

                showMessage("User deleted successfully!");

                loadUsers();
            };
        });


            listItem.appendChild(avatar);
            listItem.appendChild(userInfo);
            listItem.appendChild(editButton);
            listItem.appendChild(deleteButton);

            userList.appendChild(listItem);
    });
}


loadUsers();

editForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const id = editId.value;

    const response = await fetch(`http://127.0.0.1:8000/users/${id}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: editName.value,
            email: editEmail.value
        })
    });

    const data = await response.json();

    if (response.ok) {
        editModal.style.display = "none";
        showMessage("User updated successfully!");

        loadUsers();
    } else {
        showMessage(data.detail);
    }
});


cancelEdit.addEventListener("click", function () {
    editModal.style.display = "none";
});


closeModal.addEventListener("click", function () {
    editModal.style.display = "none";
});


cancelDelete.addEventListener("click", function () {
    deleteModal.style.display = "none";
});


closeDeleteModal.addEventListener("click", function () {
    deleteModal.style.display = "none";
});


searchInput.addEventListener("input", function () {

    const searchText = searchInput.value.toLowerCase();

    const filteredUsers = allUsers.filter(function (user) {

        return (
            user.name.toLowerCase().includes(searchText) ||
            user.email.toLowerCase().includes(searchText)
        );

    });

    displayUsers(filteredUsers);
});