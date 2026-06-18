/* =====================================================
   JAGWA VOTER AUTH
===================================================== */

function setMessage(text, type = "error") {
    const msg = document.getElementById("loginMessage");
    if (!msg) return;

    msg.textContent = text || "";
    msg.classList.toggle("success", type === "success");
}

async function readResponse(response) {
    const text = await response.text();

    try {
        return text ? JSON.parse(text) : null;
    } catch {
        return text;
    }
}

function saveVoter(data, fullName, phoneNumber) {
    const token =
        data?.token ||
        data?.access ||
        data?.key ||
        data?.voter_token ||
        data?.user?.token ||
        "";

    const voter = {
        token: token,
        full_name: data?.full_name || data?.name || data?.username || fullName,
        phone: data?.phone || data?.phone_number || phoneNumber,
        raw: data
    };

    localStorage.setItem("jagwaVoter", JSON.stringify(voter));
    localStorage.setItem("voterProfile", JSON.stringify(voter));
}

async function loginVoter(fullName, phoneNumber) {
    const payload = {
        full_name: fullName,
        name: fullName,
        username: fullName,
        phone: phoneNumber,
        phone_number: phoneNumber
    };

    const response = await fetch("/api/login/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const data = await readResponse(response);

    if (!response.ok) {
        throw new Error(
            typeof data === "string"
                ? data
                : data?.detail || data?.message || data?.error || "Login failed"
        );
    }

    saveVoter(data, fullName, phoneNumber);
    return data;
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    const btn = document.getElementById("loginBtn");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const fullName = document.getElementById("fullName").value.trim();
        const phoneNumber = document.getElementById("phoneNumber").value.trim();

        if (!fullName || !phoneNumber) {
            setMessage("Enter your full name and phone number.");
            return;
        }

        if (phoneNumber.length < 7) {
            setMessage("Enter a valid phone number.");
            return;
        }

        try {
            setMessage("");
            btn.disabled = true;
            btn.textContent = "Checking...";

            await loginVoter(fullName, phoneNumber);

            setMessage("Login successful. Redirecting...", "success");

            setTimeout(() => {
                window.location.href = "/vote/";
            }, 500);

        } catch (error) {
            setMessage(error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "Continue to Vote →";
        }
    });
});
