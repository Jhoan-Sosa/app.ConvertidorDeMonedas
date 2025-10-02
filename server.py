# server.py
import json
import os
from flask import Flask, request, jsonify, abort
from flask_cors import CORS
from datetime import datetime

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(APP_DIR, "db.json")

app = Flask(__name__)
CORS(app)  # habilita CORS

# -------------------------
# Helpers simples para leer/escribir db.json
# -------------------------
def read_db():
    if not os.path.exists(DB_PATH):
        data = {"users": []}
        write_db(data)
        return data
    with open(DB_PATH, "r", encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            # si el archivo está corrupto, reiniciar mínimo
            data = {"users": []}
            write_db(data)
            return data

def write_db(data):
    with open(DB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def generate_id():
    # id simple único
    return "u_" + datetime.utcnow().strftime("%Y%m%d%H%M%S%f")

# -------------------------
# Endpoints: Users CRUD
# -------------------------
@app.route("/users", methods=["GET"])
def get_users():
    db = read_db()
    return jsonify(db.get("users", [])), 200

@app.route("/users/<user_id>", methods=["GET"])
def get_user(user_id):
    db = read_db()
    user = next((u for u in db.get("users", []) if u.get("id") == user_id), None)
    if not user:
        return jsonify({"error": "No encontrado"}), 404
    return jsonify(user), 200

@app.route("/users", methods=["POST"])
def create_user():
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return jsonify({"error": "JSON inválido"}), 400
    # campos esperados: name, email, prefCurrency (opcional)
    name = payload.get("name") or payload.get("nombre") or payload.get("Name")
    if not name:
        return jsonify({"error": "name es requerido"}), 400

    db = read_db()
    # evitar duplicados por email+name (simple)
    users = db.get("users", [])
    # crear nuevo objeto usuario
    new_user = {
        "id": generate_id(),
        "name": name,
        "email": payload.get("email", ""),
        "prefCurrency": payload.get("prefCurrency", ""),
        "created": datetime.utcnow().isoformat(),
        "historial": payload.get("historial", []) or []
    }
    users.append(new_user)
    db["users"] = users
    write_db(db)
    return jsonify(new_user), 201

@app.route("/users/<user_id>", methods=["PUT"])
def update_user(user_id):
    payload = request.get_json(force=True, silent=True)
    if not payload:
        return jsonify({"error": "JSON inválido"}), 400
    db = read_db()
    users = db.get("users", [])
    idx = next((i for i,u in enumerate(users) if u.get("id") == user_id), None)
    if idx is None:
        return jsonify({"error": "Usuario no encontrado"}), 404
    # fusionar: mantener id y created si existe
    existing = users[idx]
    merged = { **existing, **payload }
    merged["id"] = existing["id"]
    if "created" not in merged:
        merged["created"] = existing.get("created", datetime.utcnow().isoformat())
    # asegúrate que historial sea lista
    if not isinstance(merged.get("historial", []), list):
        merged["historial"] = existing.get("historial", [])
    users[idx] = merged
    db["users"] = users
    write_db(db)
    return jsonify(merged), 200

@app.route("/users/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    db = read_db()
    users = db.get("users", [])
    new_users = [u for u in users if u.get("id") != user_id]
    if len(new_users) == len(users):
        return jsonify({"error": "Usuario no encontrado"}), 404
    db["users"] = new_users
    write_db(db)
    return jsonify({"ok": True}), 200

# -------------------------
# Ruta adicional: historial por usuario (consulta simple)
# -------------------------
@app.route("/users/<user_id>/historial", methods=["GET"])
def historial_usuario(user_id):
    db = read_db()
    user = next((u for u in db.get("users", []) if u.get("id") == user_id), None)
    if not user:
        return jsonify({"error": "Usuario no encontrado"}), 404
    return jsonify(user.get("historial", [])), 200

# -------------------------
# Iniciar servidor
# -------------------------
if __name__ == "__main__":
    # puerto 5000 por defecto
    app.run(host="0.0.0.0", port=5000, debug=True)
