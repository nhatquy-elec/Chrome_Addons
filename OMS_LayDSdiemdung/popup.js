document.getElementById('startBtn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const status = document.getElementById('status');
  
  if (!tab.url.includes("oms2.cpc.vn")) {
    status.innerText = "Lỗi: Vui lòng mở trang oms2.cpc.vn";
    return;
  }

  status.innerText = "Đang xử lý... Vui lòng không đóng tab.";
  document.getElementById('startBtn').disabled = true;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scrapeDataLogic
  }, () => {
    status.innerText = "Hoàn thành! Kiểm tra file tải về.";
    document.getElementById('startBtn').disabled = false;
  });
});

// Hàm này sẽ được "bắn" vào trong trang web
async function scrapeDataLogic() {
  const loaiPhanTuIds = ['diemdung_tamthoi']//, 'diemdung_phaply'];
  const selectLoai = document.querySelector('#sltLoaiPhanTu');
  const selectDonVi = document.querySelector('#sltDonVi');
  const btnXem = document.querySelector('#xem');
  let allData = [];

  const triggerChange = (el, value) => {
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const donViValues = Array.from(selectDonVi.options)
    .map(opt => opt.value)
    .filter(val => val && val.trim() !== "");

  for (let loaiId of loaiPhanTuIds) {
    triggerChange(selectLoai, loaiId);
    for (let dvId of donViValues) {
      triggerChange(selectDonVi, dvId);
      btnXem.click();
      await new Promise(r => setTimeout(r, 1000)); 

      const rows = document.querySelectorAll('table.table tbody tr');
      rows.forEach(row => {
        const cols = Array.from(row.querySelectorAll('td')).map(td => td.innerText.trim());
        if (cols.length > 1) {
          allData.push([loaiId, ...cols]);
        }
      });
    }
  }

  if (allData.length > 0) {
    let csvContent = "\uFEFFLoại,STT,Đơn vị,ID,Tên phần tử\n"; 
    allData.forEach(row => csvContent += `"${row.join('","')}"\n`);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ket_qua_tong_hop.csv";
    link.click();
  }
}