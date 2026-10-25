chrome.action.onClicked.addListener((tab) => {
    // Danh sách ID cần quét
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

    const scrapeTableData = (nodeId) => {
        let table = document.querySelector('div#listTramPP table');
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        if (rows.length === 1 && (rows[0].innerText.includes("Chưa có") || rows[0].innerText.includes("đang tải"))) {
            return;
        }

        if (allData.length === 0) {
            const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
            allData.push(["ID_Node", ...headers]);
        }

        rows.forEach(row => {
            const rowValues = Array.from(row.querySelectorAll('td')).map(col => `"${col.innerText.trim().replace(/"/g, '""')}"`);
            if (rowValues.length > 0) allData.push([`"${nodeId}"`, ...rowValues]);
        });
    };

    const processNode = async (nodeId) => {
        console.log(`Đang xử lý ID: ${nodeId}`);
        
        // Ghi đè nội dung hiển thị để dễ theo dõi
        const tbody = document.querySelector('div#listTramPP table tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="10">Đang tải...</td></tr>';

        if (typeof window.downstream_get_trampp === 'function') {
            window.downstream_get_trampp(nodeId);

            // Chờ dữ liệu xuất hiện
            await new Promise(resolve => {
                const start = Date.now();
                const check = setInterval(() => {
                    const rows = document.querySelectorAll('div#listTramPP table tbody tr');
                    const firstRowText = rows[0]?.innerText || "";
                    const isLoaded = (rows.length > 1) || 
                                     (rows.length === 1 && !firstRowText.includes("Đang tải") && !firstRowText.includes("Chưa có"));

                    if (isLoaded || Date.now() - start > 3000) {
                        clearInterval(check);
                        setTimeout(resolve, 800); 
                    }
                }, 400);
            });

            // Thu thập dữ liệu
            scrapeTableData(nodeId);

            // Thực thi hành động Xóa (nút bạn đã chọn) sau khi đã lưu xong dữ liệu
            const deleteBtn = document.querySelector('button.btn.btn-outline-primary');
            if (deleteBtn) deleteBtn.click();

        }
    };

    const downloadCSV = () => {
        if (allData.length <= 1) return;
        const csvContent = "\uFEFF" + allData.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Data_OMS_${Date.now()}.csv`;
        link.click();
    };

    (async () => {
        for (const id of idList) {
            await processNode(id);
            await new Promise(r => setTimeout(r, 500)); 
        }
        downloadCSV();
        console.log("Hoàn thành.");
    })();
}