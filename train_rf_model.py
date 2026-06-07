import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import skl2onnx
from skl2onnx.common.data_types import FloatTensorType
import os

print("Memuat dataset...")
# Load dataset
df = pd.read_csv("UMKM-data/synthetic_umkm_data_new_labels.csv")

# Pilih fitur yang akan digunakan
features = [
    'Monthly_Revenue', 
    'Burn_Rate_Ratio', 
    'Transaction_Count', 
    'Business_Tenure_Months', 
    'Repeat_Order_Rate (%)', 
    'Sentiment_Score'
]
target = 'Class'

X = df[features].astype(np.float32)
y = df[target]

# Split data (untuk memverifikasi akurasi)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

print("Melatih model Random Forest...")
# Train Random Forest Classifier
clf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
clf.fit(X_train, y_train)

# Evaluasi Akurasi
y_pred = clf.predict(X_test)
print("\n=== Laporan Klasifikasi ===")
print(classification_report(y_test, y_pred))

# Konversi ke ONNX
print("\nMengekspor model ke ONNX...")
# Input type harus sesuai dengan jumlah fitur (6 fitur float)
initial_type = [('float_input', FloatTensorType([None, 6]))]

# Convert model
onnx_model = skl2onnx.convert_sklearn(
    clf, 
    initial_types=initial_type,
    options={id(clf): {'zipmap': False}} # Penting untuk onnxruntime-web agar tidak mengembalikan dict
)

# Buat folder models jika belum ada
os.makedirs('models', exist_ok=True)

# Simpan file ONNX
with open("models/rf_umkm_classifier.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())

print("Selesai! Model disimpan di models/rf_umkm_classifier.onnx")
print("Kamu bisa langsung menggunakannya di Web App!")
