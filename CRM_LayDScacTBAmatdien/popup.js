document.getElementById('startBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) return;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: runAutoExportInMainWorld,
    world: 'MAIN' // QUAN TRỌNG: Chạy script trong môi trường của trang web (giống Console)
  });
});

// Toàn bộ logic bên dưới sẽ được "ném" vào trang web để chạy
async function runAutoExportInMainWorld() {
    let combinedData = [];
    let headersExtracted = false;

    const getPageButtons = () => {
        return Array.from(document.querySelectorAll('.dataTables_paginate ul li a'))
            .filter(a => !isNaN(parseInt(a.textContent.trim())))
            .sort((a, b) => parseInt(a.textContent) - parseInt(b.textContent));
    };

    const buttons = getPageButtons();
    const totalPages = buttons.length;
    
    if (totalPages === 0) {
        alert("Không tìm thấy các nút phân trang!");
        return;
    }

    console.log(`🚀 Extension bắt đầu: Tìm thấy ${totalPages} trang.`);

    for (let i = 0; i < totalPages; i++) {
        // Lấy lại danh sách nút để tránh lỗi DOM đã thay đổi
        const currentButtons = getPageButtons();
        if (!currentButtons[i]) break;

        const pageNum = currentButtons[i].textContent.trim();
        console.log(`--- Đang xử lý Trang ${pageNum}/${totalPages} ---`);
        
        currentButtons[i].click();

        // Đợi 2 giây để trang tải dữ liệu
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mở rộng "Xem đầy đủ"
        const targetElements = Array.from(document.querySelectorAll('*'))
            .filter(el => el.childNodes.length === 1 && el.textContent.trim() === 'Xem đầy đủ');
        
        if (targetElements.length > 0) {
            targetElements.forEach(el => el.click());
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Copy dữ liệu
        const table = document.querySelector('#divLichCupDienList table') || document.querySelector('table');
        if (table) {
            const rows = Array.from(table.querySelectorAll('tr'));
            rows.forEach((row) => {
                const cells = Array.from(row.querySelectorAll('td, th'))
                    .map(c => c.innerText.trim().replace(/\n/g, " | "));

                if (cells.length > 0) {
                    const isHeaderRow = row.querySelector('th');
                    if (isHeaderRow) {
                        if (!headersExtracted) {
                            combinedData.push(cells);
                            headersExtracted = true;
                        }
                    } else {
                        combinedData.push(cells);
                    }
                }
            });
        }
    }

    // Xuất Excel
    if (combinedData.length > 1) {
        const BOM = "\uFEFF";
        const csvContent = BOM + combinedData
            .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
            .join("\r\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `LichCupDien_TongHop_${new Date().getTime()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("🎊 XUẤT FILE THÀNH CÔNG!");
    } else {
        alert("Không lấy được dữ liệu. Hãy đảm bảo bạn đang ở đúng trang có bảng dữ liệu.");
    }
}