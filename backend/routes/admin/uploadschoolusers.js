const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const db = require('../../config/db');

const upload = multer({
    dest: 'uploads/',
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || // .xlsx
            file.mimetype === 'application/vnd.ms-excel' // .xls
        ) cb(null, true);
        else cb(new Error('Only Excel files (.xlsx, .xls) are allowed!'));
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const filePath = req.file.path;
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet);

        // Expected columns: name, email, password, role, class, schoolname
        let inserted = 0, failed = 0;
        for (const row of rows) {
            if (!row.name || !row.email || !row.password || !row.role || !row.class || !row.schoolname) {
                failed++;
                continue;
            }
            try {
                await new Promise((resolve, reject) => {
                    db.query(
                        'INSERT INTO users (name, email, password, role, class, schoolname, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, NOW())',
                        [row.name, row.email, row.password, row.role, row.class, row.schoolname],
                        (err, result) => {
                            if (err) reject(err); else resolve(result);
                        }
                    );
                });
                inserted++;
            } catch (e) { failed++; }
        }
        fs.unlinkSync(filePath);
        return res.json({ success: true, inserted, failed });
    } catch (err) {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(500).json({ success: false, error: 'Server error: ' + err.message });
    }
});

module.exports = router;
