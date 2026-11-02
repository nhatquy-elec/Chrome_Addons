// Lắng nghe sự kiện click vào biểu tượng Extension để thực thi script
chrome.action.onClicked.addListener((tab) => {
    const idList = ['49717','49718','49719','49720',
        '49722','49721','49237','49236','49235','49234',
        '1128840','48418','48419','48744','48745','48746',
        '48747','48749','48748','33204','29371','32879','29361',
        '32877','31961','32878','43569','44471','43707','44479',
        '43778','44486','252976','41697','53965','41598','53966',
        '40951','53968','40764','53969','40525','53971','53973',
        '53975','292009','48289','48290','48291','48292','48294',
        '48293','291909','292893','292015','292968','299804','292014',
        '291910','330146','325349','325339','325350','325341','325342',
        '325343','325344','325345','45724','45712','45685','174347',
        '174314','174315','174316','174317','174319','174318','38334',
        '44180','38547','44181','38314','44182','38304','44183','38300',
        '44185','38296','44184','279475','279474','279473','269413',
        '317115','317113','49167','49402','49152','49400','49149',
        '49373','49095','49433','49085','310461','310463','310466','310465','323897'];
    
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: mainScript,
        args: [idList],
        world: 'MAIN'
    });
});

function mainScript(idList) {
    let allData = [];

    // Nhóm 1: Trích xuất dữ liệu từ các hàng trong bảng sau khi tải xong
    const scrapeTableData = (nodeId) => {
        const table = document.querySelector('div#listTramPP table');
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0 || (rows.length === 1 && (rows[0].id === "imgLoading" || rows[0].innerText.includes("Chưa có")))) return;

        if (allData.length === 0) {
            const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
            allData.push(["ID_Node", ...headers]);
        }

        rows.forEach(row => {
            const values = Array.from(row.querySelectorAll('td')).map(col => `"${col.innerText.trim().replace(/"/g, '""')}"`);
            if (values.length > 1) allData.push([`"${nodeId}"`, ...values]);
        });
    };

    // Nhóm 2: Theo dõi sự thay đổi DOM (MutationObserver) để nhận biết khi nào dữ liệu mới đã render
    const waitForUpdate = () => {
        return new Promise((resolve) => {
            const target = document.querySelector('div#listTramPP table tbody');
            if (!target) return resolve();

            const observer = new MutationObserver((mutations, obs) => {
                const firstRow = target.querySelector('tr');
                // Nếu dòng đầu tiên không phải loading/đang tải thì coi như xong
                if (!(firstRow && (firstRow.id === "imgLoading" || firstRow.innerText.includes("tải")))) {
                    obs.disconnect();
                    clearTimeout(timeout);
                    setTimeout(resolve, 150); // thời gian đệm nhỏ để đảm bảo bảng sau khi load ổn định
                }
            });

            observer.observe(target, { childList: true, subtree: true });
            const timeout = setTimeout(() => { observer.disconnect(); resolve(); }, 3500); // Timeout 3.5s dự phòng
        });
    };

    // Nhóm 3: Điều phối quy trình xử lý cho từng ID (Xóa bảng cũ -> Gọi hàm tải -> Đợi -> Lưu dữ liệu)
    const processNode = async (nodeId) => {
        if (typeof window.downstream_get_trampp !== 'function') return;

        const deleteBtn = document.querySelector('button.btn.btn-outline-primary');
        if (deleteBtn) {
            deleteBtn.click();
            await new Promise(r => setTimeout(r, 150)); // Khoảng nghỉ nhỏ để bảng cũ được xóa
        }

        window.downstream_get_trampp(nodeId);
        await waitForUpdate();
        scrapeTableData(nodeId);
    };

    // Nhóm 4: Chuyển đổi toàn bộ mảng dữ liệu thành file CSV và kích hoạt tải về
    const downloadCSV = () => {
        if (allData.length <= 1) return;
        const csvContent = "\uFEFF" + allData.map(e => e.join(",")).join("\n");
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
        link.download = `Data_OMS_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Nhóm 5: Vòng lặp chính xử lý tuần tự danh sách ID
    (async () => {
        for (const id of idList) {
            await processNode(id);
            await new Promise(r => setTimeout(r, 150)); // Khoảng nghỉ nhỏ tránh xung đột request
        }
        downloadCSV();
    })();
}