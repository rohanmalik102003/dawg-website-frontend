# backend/database.py

import os
import uuid
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

# Load environment variables
load_dotenv()

# Initialize Firebase Admin SDK
cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
if not cred_path or not os.path.exists(cred_path):
    raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY is not set or invalid")

if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

# Firestore client
db = firestore.client()

def now():
    return firestore.SERVER_TIMESTAMP

def generate_id():
    return str(uuid.uuid4())

# USERS

def create_user(uid, data):
    user_ref = db.collection("users").document(uid)
    data.update({
        "uid": uid,
        "created_at": now(),
        "updated_at": now(),
        "last_notification_read_at": now(),
        "rating": 0.0,
        "rating_count": 0,
        "completed_tasks": 0,
        "posted_tasks": 0,
        "is_verified": False,
    })
    user_ref.set(data)
    return user_ref.id

def get_user(uid):
    return db.collection("users").document(uid).get().to_dict()

# TASKS

def create_task(data):
    task_id = generate_id()
    data.update({
        "status": "open",
        "created_at": now(),
        "updated_at": now(),
        "completed_at": None,
        "images": data.get("images", [])
    })
    db.collection("tasks").document(task_id).set(data)
    return task_id

def get_task(task_id):
    return db.collection("tasks").document(task_id).get().to_dict()

# APPLICATIONS

def create_application(task_id, applicant_uid, data):
    app_id = generate_id()
    data.update({
        "applicant_uid": applicant_uid,
        "created_at": now(),
        "updated_at": now(),
        "status": "pending"
    })
    db.collection("tasks").document(task_id).collection("applications").document(app_id).set(data)
    return app_id

def get_applications(task_id):
    apps = db.collection("tasks").document(task_id).collection("applications").stream()
    return [app.to_dict() | {"id": app.id} for app in apps]

# CHATS

def create_chat(data):
    chat_id = generate_id()
    data.update({
        "created_at": now(),
        "updated_at": now(),
        "last_message_at": now(),
        "location_shared": False,
        "location_shared_by": None,
        "location_accepted_by": None
    })
    db.collection("chats").document(chat_id).set(data)
    return chat_id

def get_chat(chat_id):
    return db.collection("chats").document(chat_id).get().to_dict()

# MESSAGES

def send_message(chat_id, sender_uid, message_data):
    msg_id = generate_id()
    message_data.update({
        "sender_uid": sender_uid,
        "created_at": now(),
        "read_at": None,
        "message_type": message_data.get("message_type", "text")
    })
    db.collection("chats").document(chat_id).collection("messages").document(msg_id).set(message_data)
    db.collection("chats").document(chat_id).update({"last_message_at": now()})
    return msg_id

def get_chat_messages(chat_id):
    msgs = db.collection("chats").document(chat_id).collection("messages").order_by("created_at").stream()
    return [msg.to_dict() | {"id": msg.id} for msg in msgs]

# REVIEWS

def create_review(data):
    review_id = generate_id()
    data.update({"created_at": now()})
    db.collection("reviews").document(review_id).set(data)
    return review_id

def get_reviews():
    reviews = db.collection("reviews").stream()
    return [r.to_dict() | {"id": r.id} for r in reviews]

# NOTIFICATIONS

def create_notification(user_uid, notif_data):
    notif_id = generate_id()
    notif_data.update({
        "read": False,
        "created_at": now()
    })
    db.collection("users").document(user_uid).collection("notifications").document(notif_id).set(notif_data)
    return notif_id

def get_notifications(user_uid):
    notifs = db.collection("users").document(user_uid).collection("notifications").order_by("created_at", direction=firestore.Query.DESCENDING).stream()
    return [n.to_dict() | {"id": n.id} for n in notifs]

# Generic helpers (used by auth.py and other routes)

def get_all_documents(collection_name):
    docs = db.collection(collection_name).stream()
    return [doc.to_dict() | {"id": doc.id} for doc in docs]

def get_document(collection_name, doc_id):
    doc = db.collection(collection_name).document(doc_id).get()
    return doc.to_dict() if doc.exists else None

def add_document(collection_name, doc_id, data):
    db.collection(collection_name).document(doc_id).set(data)
    return doc_id

def update_document(collection_name, doc_id, data):
    db.collection(collection_name).document(doc_id).update(data)

def delete_document(collection_name, doc_id):
    db.collection(collection_name).document(doc_id).delete()
