# 📄 Kontrak API HRIS - Frontend ke Backend

> Dokumen ini adalah panduan untuk **Tim Backend**. Berikut adalah daftar *endpoints* API yang diminta oleh sisi Frontend beserta bentuk struktur JSON (Payload) yang diharapkan agar aplikasi SvelteKit dapat berjalan tanpa *error*. Semua *endpoint* harus mengembalikan HTTP Status 200 dan dibungkus di dalam struktur standar aplikasi (`status`, `message`, `data`).

---

## 1. Dashboard Metrics
- **Method:** `GET`
- **Endpoint:** `/api/v1/hris/dashboard/metrics`
- **Deskripsi:** Mengambil data ringkasan untuk kartu metrik di halaman Overview.
- **Expected Response:**
```json
{
  "status": "success",
  "message": "Metrics retrieved successfully",
  "data": {
    "totalEmployees": 648,
    "presentToday": 602,
    "attendanceCapacity": 92,
    "totalLeaveRequests": 12,
    "pendingLeaveRequests": 5,
    "openPositions": 8,
    "highPriorityPositions": 3
  }
}
```

---

## 2. Employees Directory
- **Method:** `GET`
- **Endpoint:** `/api/v1/hris/employees`
- **Deskripsi:** Menampilkan daftar direktori seluruh karyawan aktif.
- **Expected Response:**
```json
{
  "status": "success",
  "message": "Employees retrieved successfully",
  "data": [
    {
      "id": "EMP-001",
      "name": "Budi Santoso",
      "role": "Manager Operations",
      "department": "Operations",
      "email": "budi.s@bcslabs.tech",
      "status": "Active",
      "joinDate": "2020-01-15",
      "avatar": "https://ui-avatars.com/api/?name=Budi+Santoso"
    }
}
```

---

## 2.1 Employee Detail
- **Method:** `GET`
- **Endpoint:** `/api/v1/hris/employees/{id}`
- **Deskripsi:** Menampilkan detail data karyawan spesifik berdasarkan ID karyawan.
- **Expected Response:**
```json
{
  "status": "success",
  "message": "Employee details retrieved successfully",
  "data": {
    "id": "EMP-001",
    "name": "Budi Santoso",
    "role": "Manager Operations",
    "department": "Operations",
    "email": "budi.s@bcslabs.tech",
    "phone": "+6281234567890",
    "status": "Active",
    "joinDate": "2020-01-15",
    "avatar": "https://ui-avatars.com/api/?name=Budi+Santoso",
    "address": "Jl. Sudirman No. 123, Cilegon",
    "manager": "Siti Aminah",
    "employmentType": "Full-time"
  }
}
```

---

## 3. Time & Attendance
- **Method:** `GET`
- **Endpoint:** `/api/v1/hris/attendance`
- **Deskripsi:** Menarik data log kehadiran (dari Mobile Presensi) beserta metrik hariannya.
- **Expected Response:**
```json
{
  "status": "success",
  "message": "Attendance retrieved successfully",
  "data": {
    "logs": [
      {
        "id": "ATT-1001",
        "employeeName": "Budi Santoso",
        "employeeId": "EMP-001",
        "department": "Engineering",
        "date": "2026-05-07",
        "checkIn": "07:45 AM",
        "checkOut": "17:15 PM",
        "status": "On Time", 
        "checkInLocation": "Kantor Pusat Cilegon",
        "checkOutLocation": "Kantor Pusat Cilegon",
        "avatar": "https://ui-avatars.com/api/?name=Budi+Santoso"
      }
    ],
    "metrics": {
      "totalEmployees": 648,
      "presentToday": 602,
      "lateToday": 24,
      "absentToday": 22
    }
  }
}
```
*(Catatan: Field `status` harus berisi antara: "On Time", "Late", atau "Absent")*

---

## 4. Leave Management
- **Method:** `GET`
- **Endpoint:** `/api/v1/hris/leaves`
- **Deskripsi:** Menampilkan daftar pengajuan cuti/izin/sakit dari aplikasi mobile presensi beserta status tiketnya.
- **Expected Response:**
```json
{
  "status": "success",
  "message": "Leaves retrieved successfully",
  "data": {
    "requests": [
      {
        "id": "LV-2026-001",
        "employeeName": "Budi Santoso",
        "employeeId": "EMP-001",
        "type": "Annual Leave (Cuti Tahunan)",
        "startDate": "2026-05-10",
        "endDate": "2026-05-12",
        "duration": 3,
        "reason": "Liburan Keluarga",
        "status": "Pending",
        "avatar": "https://ui-avatars.com/api/?name=Budi+Santoso"
      }
    ],
    "metrics": {
      "pendingApprovals": 12,
      "approvedThisMonth": 45,
      "rejectedThisMonth": 3,
      "employeesOnLeaveToday": 8
    }
  }
}
```
*(Catatan: Field `status` harus berisi antara: "Pending", "Approved", atau "Rejected")*

---

## 5. Lifecycle & Disciplinary
- **Method:** `GET`
- **Endpoint:** `/api/v1/hris/lifecycle`
- **Deskripsi:** Menampilkan riwayat promosi, mutasi, terminasi, dan SP (Surat Peringatan).
- **Expected Response:**
```json
{
  "status": "success",
  "message": "Lifecycle records retrieved successfully",
  "data": {
    "actions": [
      {
        "id": "MUT-2026-101",
        "type": "Mutation",
        "employeeName": "Budi Santoso",
        "employeeId": "EMP-001",
        "date": "2026-05-01",
        "description": "Transferred from Serang Branch to Cilegon HQ",
        "status": "Completed"
      }
    ],
    "metrics": {
      "activeMutations": 5,
      "activeWarnings": 12,
      "pendingTerminations": 3
    }
  }
}
```
*(Catatan: Field `type` harus mengandung kata "Mutation", "Warning", atau "Termination" agar UI dapat memberikan icon yang sesuai)*

---

## 6. Performance & Training
- **Method:** `GET`
- **Endpoint:** `/api/v1/hris/performance`
- **Deskripsi:** Menyediakan hasil evaluasi KPI karyawan dan informasi jadwal training/pelatihan.
- **Expected Response:**
```json
{
  "status": "success",
  "message": "Performance metrics retrieved successfully",
  "data": {
    "kpiRecords": [
      {
        "id": "KPI-2026-Q1-001",
        "employeeName": "Budi Santoso",
        "employeeId": "EMP-001",
        "department": "Engineering",
        "period": "Q1 2026",
        "score": 92,
        "grade": "A",
        "evaluator": "Manager Ops"
      }
    ],
    "trainingPrograms": [
      {
        "id": "TRN-2026-01",
        "title": "Advanced React & SvelteKit Integration",
        "date": "2026-05-20",
        "participants": 12,
        "status": "Upcoming"
      }
    ],
    "metrics": {
      "avgKpiScore": 84.5,
      "totalEvaluated": 124,
      "upcomingTrainings": 3
    }
  }
}
```
