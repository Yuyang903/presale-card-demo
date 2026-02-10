// 日期格式化工具函数
        function formatDate(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const h = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            const s = String(date.getSeconds()).padStart(2, '0');
            return `${y}-${m}-${d} ${h}:${min}:${s}`;
        }

        // 切换主视图 (后台/用户端)
        function switchView(viewName, event) {
            if(event) event.preventDefault();
            // 更新导航状态
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            if(event && event.target) event.target.classList.add('active');
            
            // 切换内容区域
            document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
            document.getElementById(viewName + '-view').classList.add('active');
        }

        // 切换后台管理Tab
        function switchAdminTab(tabName, event) {
            if(event) event.preventDefault();
            // 更新侧边栏状态
            document.querySelectorAll('.admin-menu-item').forEach(el => el.classList.remove('active'));
            if(event && event.target) event.target.classList.add('active');
            
            // 切换模块显示
            document.querySelectorAll('.admin-module').forEach(el => el.style.display = 'none');
            document.getElementById('tab-' + tabName).style.display = 'block';
        }

        // 打开弹窗
        function openModal(modalId) {
            document.getElementById(modalId).classList.add('open');
        }

        // 关闭弹窗
        function closeModal(modalId, event) {
            // 仅当没有事件对象（显式调用）或点击的是遮罩层本身时才关闭
            if (!event || event.target === document.getElementById(modalId)) {
                document.getElementById(modalId).classList.remove('open');
            }
        }

        // 切换详情Tab
        function switchDetailTab(tabName) {
            document.querySelectorAll('.detail-tab').forEach(el => {
                el.classList.remove('active');
                el.style.borderBottom = 'none';
                el.style.fontWeight = 'normal';
                el.style.color = '#666';
            });
            var activeTab = document.getElementById('dt-' + tabName);
            activeTab.classList.add('active');
            activeTab.style.borderBottom = '2px solid var(--primary-color)';
            activeTab.style.fontWeight = 'bold';
            activeTab.style.color = 'var(--primary-color)';
            
            document.getElementById('detail-tab-batch-view').style.display = 'none';
            document.getElementById('detail-tab-card-view').style.display = 'none';
            document.getElementById('detail-tab-' + tabName + '-view').style.display = 'block';
        }

        // 打开修改批次弹窗
        function openEditBatchModal(btn) {
            if (!btn.id) btn.id = 'btn-edit-' + Date.now();
            document.getElementById('edit-target-btn-id').value = btn.id;
            
            var row = btn.closest('tr');
            var cells = row.cells;
            
            // 1. 批次名称
            var batchNameText = cells[1].innerText;
            var batchName = batchNameText.split('\n')[0].trim();
            
            // 2. 分发商 (简单匹配)
            var distText = cells[3].innerText.trim();
            var distVal = "";
            if (distText.includes("分发商A")) distVal = "dist_a";
            else if (distText.includes("分发商B")) distVal = "dist_b";
            // else 直营 or unknown -> ""

            // 3. 时间信息 (生成/开始/发货)
            var timeCell = cells[6];
            // 结构: <div>生成...</div><div>开始...</div><div>预计发货...</div>
            // 解析所有div文本
            var divs = timeCell.querySelectorAll('div');
            var startTime = "";
            var deliveryTime = "";
            
            divs.forEach(div => {
                var text = div.innerText;
                if (text.includes("开始：")) {
                    // 格式: 开始：2023-09-20 00:00
                    var t = text.split('：')[1].trim();
                    // input type="datetime-local" 需要格式 YYYY-MM-DDTHH:mm
                    startTime = t.replace(' ', 'T');
                }
                if (text.includes("发货：")) {
                     deliveryTime = text.split('：')[1].trim();
                }
            });

            // 填充表单
            document.getElementById('edit-batch-name').value = batchName;
            document.getElementById('edit-distributor').value = distVal;
            document.getElementById('edit-start-time').value = startTime;
            document.getElementById('edit-delivery-time').value = deliveryTime;
            document.getElementById('edit-add-quantity').value = 0; // 重置增加数量
            document.getElementById('edit-remark').value = row.dataset.remark || ''; 
            
            // 重置卡号设置区域
            document.getElementById('edit-card-no-group').style.display = 'none';
            document.querySelector('input[name="editCardNoMode"][value="auto"]').checked = true;
            toggleEditCardMode('auto');

            openModal('editBatchModal');
        }
        
        // 监听增加数量变化
        function handleEditQtyChange() {
            var qty = parseInt(document.getElementById('edit-add-quantity').value) || 0;
            var group = document.getElementById('edit-card-no-group');
            if (qty > 0) {
                group.style.display = 'block';
                // 触发一次计算
                var mode = document.querySelector('input[name="editCardNoMode"]:checked').value;
                toggleEditCardMode(mode);
            } else {
                group.style.display = 'none';
            }
        }

        // 切换修改卡号模式
        function toggleEditCardMode(mode) {
            var box = document.getElementById('editCardNoRangeBox');
            var tip = document.getElementById('editCardNoAutoTip');
            
            if (mode === 'custom') {
                box.style.display = 'flex';
                tip.style.display = 'none';
                calcEditCardRange();
            } else {
                box.style.display = 'none';
                tip.style.display = 'block';
                
                // 计算自动顺延的范围
                var btnId = document.getElementById('edit-target-btn-id').value;
                var btn = document.getElementById(btnId);
                if(btn) {
                    var row = btn.closest('tr');
                    // 假设原有范围是 1-100
                    var startNo = parseInt(row.dataset.startNo) || 1;
                    var currentTotal = parseInt(row.dataset.total) || parseInt(row.cells[5].innerText) || 0;
                    
                    // 新段起始 = 旧起始 + 旧总数
                    // 比如 1-100 (100个)，下个是 101
                    var nextStart = startNo + currentTotal;
                    var qty = parseInt(document.getElementById('edit-add-quantity').value) || 0;
                    var nextEnd = nextStart + qty - 1;
                    
                    if (qty > 0) {
                        document.getElementById('editAutoRange').innerText = 'NO.' + nextStart + ' - ' + nextEnd;
                    } else {
                        document.getElementById('editAutoRange').innerText = '--';
                    }
                }
            }
        }

        // 计算自定义范围
        function calcEditCardRange() {
            var start = parseInt(document.getElementById('editStartCardNo').value) || 1;
            var qty = parseInt(document.getElementById('edit-add-quantity').value) || 0;
            var end = start + qty - 1;
            document.getElementById('editEndCardNo').innerText = end;
        }
        
        // 提交修改
        function submitEditBatch() {
            var btnId = document.getElementById('edit-target-btn-id').value;
            var btn = document.getElementById(btnId);
            
            if (!btn) {
                closeModal('editBatchModal');
                return;
            }
            
            var row = btn.closest('tr');
            var cells = row.cells;
            
            var newName = document.getElementById('edit-batch-name').value.trim();
            var newDistVal = document.getElementById('edit-distributor').value;
            var newStartTime = document.getElementById('edit-start-time').value;
            var newDelivery = document.getElementById('edit-delivery-time').value;
            var addQty = parseInt(document.getElementById('edit-add-quantity').value) || 0;
            var newRemark = document.getElementById('edit-remark').value;
            
            if(!newName) {
                alert('批次名称不能为空');
                return;
            }
            if(addQty < 0) {
                alert('增加数量不能为负数');
                return;
            }
            
            // 1. 更新批次名称 & 数量范围
            // 获取原有起始号
            var startNo = parseInt(row.dataset.startNo) || 1;
            var currentTotal = parseInt(row.dataset.total) || parseInt(cells[5].innerText) || 0; // Total is at index 5
            var newTotal = currentTotal + addQty;
            
            // 处理卡号显示逻辑
            var rangeText = '';
            var existingRangeText = '(NO.' + startNo + '-' + (startNo + currentTotal - 1) + ')';
            
            if (addQty > 0) {
                var mode = document.querySelector('input[name="editCardNoMode"]:checked').value;
                var newStartNo, newEndNo;
                
                if (mode === 'auto') {
                    // 顺延
                    newStartNo = startNo + currentTotal;
                    newEndNo = newStartNo + addQty - 1;
                    // 如果是顺延，显示合并后的范围
                    // NO.1-150
                    rangeText = '(NO.' + startNo + '-' + newEndNo + ')';
                } else {
                    // 自定义
                    newStartNo = parseInt(document.getElementById('editStartCardNo').value) || 1;
                    newEndNo = newStartNo + addQty - 1;
                    // 显示分段范围
                    // NO.1-100, NO.200-249
                    // 简化显示：追加新段
                    rangeText = existingRangeText.replace(')', '') + ', ' + newStartNo + '-' + newEndNo + ')';
                }
            } else {
                rangeText = existingRangeText;
            }

            cells[1].innerHTML = newName + ' <br><span style="font-size:12px;color:#999;">' + rangeText + '</span>';
            
            // 2. 更新分发商
            var distSelect = document.getElementById('edit-distributor');
            var distText = distSelect.options[distSelect.selectedIndex].text;
            if (newDistVal === "") distText = "直营"; // 简化显示
            cells[3].innerText = distText;

            // 3. 更新数量
            cells[5].innerText = newTotal;
            row.dataset.total = newTotal;
            
            // 4. 更新时间信息
            // 保持原有的生成时间
            var timeCell = cells[6];
            var genTimeDiv = timeCell.querySelector('div:first-child'); // 假设第一个是生成时间
            var genTimeHtml = genTimeDiv ? genTimeDiv.outerHTML : '<div style="color:#999;">生成：-</div>';
            
            var startTimeHtml = '';
            if (newStartTime) {
                var displayStart = newStartTime.replace('T', ' ');
                startTimeHtml = '<div>开始：' + displayStart + '</div>';
            }
            
            var deliveryHtml = '';
             if (newDelivery) {
                deliveryHtml = '<div style="color:#27ae60;">预计发货：' + newDelivery + '</div>';
            }
            
            timeCell.innerHTML = genTimeHtml + startTimeHtml + deliveryHtml;

            // 5. 更新备注
            row.dataset.remark = newRemark;
            
            closeModal('editBatchModal');
            setTimeout(function() {
                var msg = '修改已保存';
                if (addQty > 0) {
                    msg += '\n已增加 ' + addQty + ' 张卡片';
                    // 实际逻辑中这里会调用后端接口生成新卡片
                }
                alert(msg);
            }, 100);
        }

        // 打开批次详情弹窗
        function openBatchDetailModal(btn) {
            var row = btn.closest('tr');
            var cells = row.cells;
            
            // 提取数据
            var batchName = cells[1].innerText.split('\n')[0];
            var productName = cells[2].innerText;
            var totalCount = row.dataset.total || cells[3].innerText;
            var stats = cells[4].innerText.split('/').map(s => parseInt(s.trim()));
            var activated = stats[0] || 0;
            var used = stats[1] || 0;
            var voided = stats[2] || 0;
            
            var timeCell = cells[5];
            var createTimeText = timeCell.querySelector('div:nth-child(1)') ? timeCell.querySelector('div:nth-child(1)').innerText : '';
            var deliveryTimeText = timeCell.querySelector('div:nth-child(3)') ? timeCell.querySelector('div:nth-child(3)').innerText : '';
            var createTime = createTimeText.includes('：') ? createTimeText.split('：')[1] : '-';
            var deliveryTime = deliveryTimeText.includes('：') ? deliveryTimeText.split('：')[1] : '-';

            // 填充数据到弹窗
            document.getElementById('bd-batch-name').innerText = batchName;
            document.getElementById('bd-product').innerText = productName;
            document.getElementById('bd-create-time').innerText = createTime;
            document.getElementById('bd-delivery-time').innerText = deliveryTime;
            
            document.getElementById('bd-total-count').innerText = totalCount;
            document.getElementById('bd-activated-count').innerText = activated;
            document.getElementById('bd-used-count').innerText = used;
            document.getElementById('bd-void-count').innerText = voided;
            
            openModal('batchDetailModal');
        }

        // 显示卡片列表 (进入二级视图)
        function showCardList(btn) {
            if (!btn) return;
            var row = btn.closest('tr');
            if (!row) return;

            // Determine context
            var container = row.closest('.admin-module');
            var type = 'product';
            if (container && container.id === 'tab-card-points') type = 'points';
            var suffix = '-' + type;

            var cells = row.cells;
            var batchName = cells[1].innerText.split('\n')[0];
            
            // 更新详情页标题
            var titleEl = document.getElementById('detail-batch-name' + suffix);
            if(titleEl) titleEl.innerText = '批次卡片列表：' + batchName;
            
            // 更新统计数据
            var totalCount = row.dataset.total || cells[5].innerText;
            
            var activated = 0;
            var used = 0;
            var voided = 0;
            var status = cells[7].innerText.trim();
            if(status.includes('已激活')) activated = totalCount;
            if(status.includes('已作废')) voided = totalCount;
            
            if(document.getElementById('detail-total-count' + suffix)) document.getElementById('detail-total-count' + suffix).innerText = totalCount;
            if(document.getElementById('detail-activated-count' + suffix)) document.getElementById('detail-activated-count' + suffix).innerText = activated;
            if(document.getElementById('detail-used-count' + suffix)) document.getElementById('detail-used-count' + suffix).innerText = used;
            if(document.getElementById('detail-void-count' + suffix)) document.getElementById('detail-void-count' + suffix).innerText = voided;

            // 切换主视图
            var listView = document.getElementById('card-list-view' + suffix);
            var detailView = document.getElementById('card-detail-view' + suffix);
            
            if(listView) listView.style.display = 'none';
            if(detailView) detailView.style.display = 'block';
        }

        // 隐藏批次详情（返回列表）
        function hideBatchDetail(type) {
             if (!type) {
                // Try to infer visible one
                if (document.getElementById('card-detail-view-product') && document.getElementById('card-detail-view-product').style.display !== 'none') type = 'product';
                else if (document.getElementById('card-detail-view-points') && document.getElementById('card-detail-view-points').style.display !== 'none') type = 'points';
                else type = 'product'; // default
            }
            var suffix = '-' + type;
            var detailView = document.getElementById('card-detail-view' + suffix);
            var listView = document.getElementById('card-list-view' + suffix);
            
            if(detailView) detailView.style.display = 'none';
            if(listView) listView.style.display = 'block';
        }

        // 更新添加按钮状态
        function updateAddBtn() {
            var select = document.getElementById('product-select');
            var btn = document.getElementById('btn-add-product');
            if (select.value) {
                btn.disabled = false;
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            } else {
                btn.disabled = true;
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            }
        }

        // 添加商品到列表
        function addProduct() {
            var select = document.getElementById('product-select');
            var value = select.value;
            if(!value) return;
            
            // 校验重复添加
            var isDuplicate = false;
            document.querySelectorAll('#selected-products span:first-child').forEach(function(el) {
                if (el.innerText === value) isDuplicate = true;
            });
            
            if (isDuplicate) {
                alert('该商品已添加，请勿重复添加！');
                select.value = "";
                updateAddBtn();
                return;
            }
            
            var container = document.getElementById('selected-products');
            var item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; background: #fff; padding: 5px 10px; border: 1px solid #eee; margin-bottom: 5px; border-radius: 4px;';
            item.innerHTML = '<span>' + value + '</span><span style="color: red; cursor: pointer;" onclick="this.parentNode.remove()">×</span>';
            container.appendChild(item);
            
            // 添加完成后重置
            select.value = "";
            updateAddBtn();
        }

        // 切换卡号模式
        function toggleCardMode(mode) {
            var box = document.getElementById('cardNoRangeBox');
            if (mode === 'custom') {
                box.style.display = 'flex';
                calcCardRange();
            } else {
                box.style.display = 'none';
            }
        }

        // 切换卡片类型 (商品/积分)
        function toggleCardType(type) {
            if (type === 'product') {
                // document.getElementById('type-product-config').style.display = 'block';
                // document.getElementById('product-config-label').innerHTML = '绑定默认商品 <span style="color:red">*</span>';
                document.getElementById('type-points-config').style.display = 'none';
                document.getElementById('time-setting-group').style.display = 'block'; // 商品卡显示时间设置
                
                // 商品卡隐藏折扣率设置
                document.getElementById('discount-rate-group').style.display = 'none';
                document.getElementById('discount-rate-tip').style.display = 'none';
            } else {
                // document.getElementById('type-product-config').style.display = 'none'; // 积分卡制卡时不配置商品
                document.getElementById('type-points-config').style.display = 'block';
                document.getElementById('time-setting-group').style.display = 'none'; // 积分卡隐藏时间设置
                
                // 积分卡显示折扣率设置
                document.getElementById('discount-rate-group').style.display = 'block';
                document.getElementById('discount-rate-tip').style.display = 'block';
            }
        }

        // 计算卡号范围
        function calcCardRange() {
            var qty = parseInt(document.getElementById('card-quantity').value) || 0;
            var start = parseInt(document.getElementById('startCardNo').value) || 1;
            var end = start + qty - 1;
            document.getElementById('endCardNo').innerText = end;
        }

        // 切换财务管理子Tab
        function switchFinanceTab(tabName) {
            // 重置Tab样式
            document.querySelectorAll('.finance-tab').forEach(el => {
                el.classList.remove('active');
                el.style.borderBottom = 'none';
                el.style.fontWeight = 'normal';
                el.style.color = '#666';
            });
            
            // 激活当前Tab样式
            var activeTab = document.getElementById('ft-' + tabName);
            activeTab.classList.add('active');
            activeTab.style.borderBottom = '2px solid var(--primary-color)';
            activeTab.style.fontWeight = 'bold';
            activeTab.style.color = 'var(--primary-color)';
            
            // 切换视图显示
            document.getElementById('finance-income-view').style.display = 'none';
            document.getElementById('finance-cost-view').style.display = 'none';
            document.getElementById('finance-overview-view').style.display = 'none';
            
            document.getElementById('finance-' + tabName + '-view').style.display = 'block';
        }

        // 切换订单管理子Tab
        function switchOrderTab(tabName) {
            // 重置Tab样式
            document.querySelectorAll('.order-tab').forEach(el => {
                el.classList.remove('active');
                el.style.borderBottom = 'none';
                el.style.fontWeight = 'normal';
                el.style.color = '#666';
            });
            
            // 激活当前Tab样式
            var activeTab = document.getElementById('ot-' + tabName);
            activeTab.classList.add('active');
            activeTab.style.borderBottom = '2px solid var(--primary-color)';
            activeTab.style.fontWeight = 'bold';
            activeTab.style.color = 'var(--primary-color)';
            
            // 切换视图显示
            document.getElementById('order-presale-view').style.display = 'none';
            document.getElementById('order-gift-view').style.display = 'none';
            
            document.getElementById('order-' + tabName + '-view').style.display = 'block';
        }

        // 激活批次逻辑
        function activateBatch(btn) {
            // 给按钮添加唯一ID，以便回调时找到它
            if (!btn.id) {
                btn.id = 'btn-activate-' + Date.now();
            }
            
            // 记录要操作的按钮ID
            document.getElementById('activate-target-btn-id').value = btn.id;
            
            // 打开确认弹窗
            openModal('activateConfirmModal');
        }

        // 确认激活回调
        function confirmActivate() {
            var btnId = document.getElementById('activate-target-btn-id').value;
            var btn = document.getElementById(btnId);
            
            if (btn) {
                var row = btn.closest('tr');
                var cells = row.cells;
                
                // 1. Update Status (Column 7, index 7)
                // Wait, index 7 is Status?
                // 0:Chk, 1:Name, 2:Type, 3:Dist, 4:Content, 5:Qty, 6:Time, 7:Status, 8:Action
                cells[7].innerHTML = '<span class="tag p1">已激活</span>';
                
                // 2. Hide Activate Button
                btn.style.display = 'none';
                
                // 3. Close Modal
                closeModal('activateConfirmModal');
            }
        }

        // 批次作废逻辑
        function voidBatch(btn) {
            var row = btn.closest('tr');
            var cells = row.cells;
            
            if (confirm('确定要作废该批次吗？\n注意：未使用的卡片将全部失效！')) {
                // 执行作废逻辑
                // 1. Update Status (Index 7)
                cells[7].innerHTML = '<span class="tag p0">已作废</span>';
                
                // 2. 移除操作按钮
                var td = btn.parentNode;
                // 保留 批次/卡片 按钮
                td.innerHTML = `
                    <button class="btn btn-info btn-sm" onclick="openBatchDetailModal(this)">详情</button>
                    <button class="btn btn-secondary btn-sm" onclick="showCardList(this)">卡片</button>
                `;
                
                alert('批次已作废');
            }
        }

        // --- 分发商管理相关逻辑 ---

        // 重置分发商表单
        function resetDistributorForm() {
            document.getElementById('distributor-id').value = '';
            document.getElementById('distributor-name').value = '';
            document.getElementById('distributor-contact').value = '';
            document.getElementById('distributor-phone').value = '';
            document.getElementById('distributor-address').value = '';
            document.getElementById('distributor-modal-title').innerText = '新增分发商';
        }

        // 编辑分发商
        function editDistributor(btn) {
            var row = btn.closest('tr');
            var cells = row.cells;
            
            document.getElementById('distributor-id').value = row.dataset.id;
            document.getElementById('distributor-name').value = cells[0].innerText;
            document.getElementById('distributor-contact').value = cells[1].innerText;
            document.getElementById('distributor-phone').value = cells[2].innerText;
            // 假设地址在 data-address 中，或者此处暂不回填地址演示
            
            document.getElementById('distributor-modal-title').innerText = '编辑分发商';
            openModal('editDistributorModal');
        }

        // 保存分发商
        function saveDistributor() {
            var id = document.getElementById('distributor-id').value;
            var name = document.getElementById('distributor-name').value;
            var contact = document.getElementById('distributor-contact').value;
            var phone = document.getElementById('distributor-phone').value;
            
            if(!name || !contact || !phone) {
                alert('请填写完整信息');
                return;
            }

            if (id) {
                // 编辑模式：更新表格
                var row = document.querySelector(`tr[data-id="${id}"]`);
                if(row) {
                    row.cells[0].innerText = name;
                    row.cells[1].innerText = contact;
                    row.cells[2].innerText = phone;
                }
            } else {
                // 新增模式：插入新行
                var table = document.getElementById('distributor-table').querySelector('tbody');
                var newId = 'd' + Date.now();
                var newRow = document.createElement('tr');
                newRow.dataset.id = newId;
                newRow.innerHTML = `
                    <td>${name}</td>
                    <td>${contact}</td>
                    <td>${phone}</td>
                    <td><span class="tag p1">合作中</span></td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="editDistributor(this)">编辑</button>
                        <button class="btn btn-danger btn-sm" onclick="toggleDistributorStatus(this)">停用</button>
                    </td>
                `;
                table.appendChild(newRow);
            }
            
            closeModal('editDistributorModal');
        }

        // 停用/启用分发商
        function toggleDistributorStatus(btn) {
            var row = btn.closest('tr');
            var statusCell = row.cells[3];
            var currentStatus = statusCell.innerText.trim();
            
            if (currentStatus === '合作中') {
                if(confirm('确定要停用该分发商吗？')) {
                    statusCell.innerHTML = '<span class="tag p0">已停用</span>';
                    btn.innerText = '启用';
                    btn.classList.remove('btn-danger');
                    btn.classList.add('btn-success');
                }
            } else {
                statusCell.innerHTML = '<span class="tag p1">合作中</span>';
                btn.innerText = '停用';
                btn.classList.remove('btn-success');
                btn.classList.add('btn-danger');
            }
        }

        // 打开新增制卡弹窗 (带类型)
        function openCreateCardModal(type) {
            openModal('createCardModal');
            var radios = document.getElementsByName('cardType');
            for(var i=0; i<radios.length; i++) {
                if(radios[i].value === type) {
                    radios[i].checked = true;
                    toggleCardType(type);
                }
            }
        }

        // 提交制卡任务
        function submitCreateCard() {
            var batchName = document.querySelector('#createCardModal input[type="text"]').value;
            if(!batchName) { alert('请输入批次名称'); return; }
            
            var cardType = document.querySelector('input[name="cardType"]:checked').value;
            var productText = '';
            var typeHtml = '';
            
            if (cardType === 'product') {
                productText = '<span style="font-size:12px;color:#e74c3c;">(待关联商品)</span>';
                typeHtml = '<span class="tag p2">商品卡</span>';
            } else {
                var points = document.getElementById('card-points').value;
                if(!points) { alert('请输入积分面额'); return; }
                productText = points + ' 积分';
                typeHtml = '<span class="tag" style="background:#9b59b6;">积分卡</span>';
            }

            var distributorSelect = document.querySelector('#createCardModal select:last-of-type'); 
            var distributorText = '直营';
            // Find distributor
            var formGroups = document.querySelectorAll('#createCardModal .form-group');
            formGroups.forEach(group => {
                if (group.innerText.includes('关联分发商')) {
                    var sel = group.querySelector('select');
                    if (sel && sel.value) distributorText = sel.options[sel.selectedIndex].text.split(' ')[0];
                }
            });

            var quantity = parseInt(document.getElementById('card-quantity').value) || 0;
            if (quantity <= 0) { alert('制卡数量必须大于0'); return; }

            // Always Inactive
            var isActivated = false;
            var statusHtml = '<span class="tag gray">未激活</span>';
            var now = formatDate(new Date());
            
            var deliveryTime = document.getElementById('create-delivery-time').value || '-';
            var remark = document.getElementById('create-remark').value;

            var cardMode = document.querySelector('input[name="cardNoMode"]:checked').value;
            var startNo = 1; 
            if (cardMode === 'custom') {
                 startNo = parseInt(document.getElementById('startCardNo').value) || 1;
            }
            var endNo = startNo + quantity - 1;
            
            var newRow = document.createElement('tr');
            newRow.dataset.total = quantity;
            newRow.dataset.remark = remark;
            newRow.dataset.startNo = startNo; // Store start no
            newRow.dataset.linked = "false";
            newRow.dataset.type = cardType;
            newRow.id = 'tr-' + Date.now(); // Ensure ID
            
            // Columns: 0:Chk, 1:Name, 2:Type, 3:Dist, 4:Content, 5:Qty, 6:Time, 7:Status, 8:Action
            newRow.innerHTML = `
                <td><input type="checkbox"></td>
                <td>${batchName} <br><span style="font-size:12px;color:#999;">(NO.${startNo}-${endNo})</span></td>
                <td>${typeHtml}</td>
                <td>${distributorText}</td>
                <td>${productText}</td>
                <td>${quantity}</td>
                <td style="font-size:12px; line-height:1.4;">
                    <div style="color:#999;">生成：${now.split(' ')[0]}</div>
                    <div style="color:#27ae60;">发货：${deliveryTime}</div>
                </td>
                <td>${statusHtml}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="openEditBatchModal(this)">修改</button>
                    <button class="btn btn-info btn-sm" onclick="openBatchDetailModal(this)">详情</button>
                    <button class="btn btn-warning btn-sm" onclick="openLinkProductModal(this)">关联商品</button>
                    <button class="btn btn-secondary btn-sm" onclick="showCardList(this)">卡片</button>
                </td>
            `;
            
            // Determine target table
            var targetTableId = 'card-list-view-product';
            if (cardType === 'points') {
                targetTableId = 'card-list-view-points';
            }
            var tbody = document.querySelector('#' + targetTableId + ' tbody');
            if (tbody) {
                tbody.insertBefore(newRow, tbody.firstChild);
                closeModal('createCardModal');
                alert('制卡任务已提交！\n批次：' + batchName + '\n数量：' + quantity + '\n状态：未激活');
            } else {
                console.error('Target table body not found:', targetTableId);
            }
        }

        // --- 关联商品相关逻辑 ---
        
        function openLinkProductModal(btn) {
            if (!btn.id) btn.id = 'btn-link-' + Date.now();
            document.getElementById('link-product-btn-id').value = btn.id;
            
            // 清空已有列表
            document.getElementById('link-selected-products').innerHTML = '';
            document.getElementById('link-product-select').value = '';
            
            // 根据卡类型调整标题
            var row = btn.closest('tr');
            var type = row.dataset.type || (row.cells[2].innerText.includes('商品卡') ? 'product' : 'points');
            
            if (type === 'product') {
                document.getElementById('link-product-modal-title').innerText = '关联商品 (商品卡)';
                document.getElementById('link-product-label').innerText = '绑定商品 (兑换范围)';
            } else {
                document.getElementById('link-product-modal-title').innerText = '关联商品池 (积分卡)';
                document.getElementById('link-product-label').innerText = '可选商品池';
            }

            openModal('linkProductModal');
        }

        function addLinkProduct() {
            var select = document.getElementById('link-product-select');
            var value = select.value;
            if(!value) return;
            
            // 校验重复
            var isDuplicate = false;
            document.querySelectorAll('#link-selected-products span:first-child').forEach(function(el) {
                if (el.innerText === value) isDuplicate = true;
            });
            
            if (isDuplicate) {
                alert('该商品已添加！');
                return;
            }
            
            var container = document.getElementById('link-selected-products');
            var item = document.createElement('div');
            item.style.cssText = 'display: flex; justify-content: space-between; background: #fff; padding: 5px 10px; border: 1px solid #eee; margin-bottom: 5px; border-radius: 4px;';
            item.innerHTML = '<span>' + value + '</span><span style="color: red; cursor: pointer;" onclick="this.parentNode.remove()">×</span>';
            container.appendChild(item);
            
            select.value = "";
        }

        function saveLinkProducts() {
            var btnId = document.getElementById('link-product-btn-id').value;
            var btn = document.getElementById(btnId);
            if(!btn) return;
            
            var products = [];
            document.querySelectorAll('#link-selected-products span:first-child').forEach(el => {
                products.push(el.innerText);
            });
            
            if (products.length === 0) {
                alert('请至少关联一个商品！');
                return;
            }
            
            // 更新表格显示
            var row = btn.closest('tr');
            var contentCell = row.querySelector('.col-content'); 
            
            // 如果没有 class 标记，尝试通过 index 获取 (通常是第5列，index 4)
            if (!contentCell) contentCell = row.cells[4];

            var type = row.dataset.type || (row.cells[2].innerText.includes('商品卡') ? 'product' : 'points');
            
            if (type === 'product') {
                contentCell.innerHTML = products.join(', ');
            } else {
                // 积分卡：保留积分面额，更新括号内的内容
                var originalText = contentCell.innerHTML.split('<br>')[0]; 
                // 如果原始文本也是空的或者不对，尝试从 dataset 获取或者解析
                if (!originalText || originalText.includes('待关联')) {
                     // 尝试从 row 的其他信息恢复，这里简化处理，假设积分数就在第一行
                     // 如果是新创建的行，innerHTML 可能是 "300 积分 <br>..."
                }
                
                // 简单处理：提取数字部分
                var points = parseInt(contentCell.innerText) || 0;
                if (points > 0) {
                    contentCell.innerHTML = points + ' 积分 <br><span style="font-size:12px;color:#999;">(可选池: ' + products.length + '个商品)</span>';
                } else {
                     contentCell.innerHTML = points + ' 积分 <br><span style="font-size:12px;color:#999;">(可选池: ' + products.length + '个商品)</span>';
                }
            }
            
            // 标记已关联
            row.dataset.linked = "true";
            
            closeModal('linkProductModal');
            alert('商品关联成功！\n共关联 ' + products.length + ' 个商品。');
        }

        // 修改激活逻辑：增加校验
        var originalActivateBatch = activateBatch; // 保存旧引用
        activateBatch = function(btn) {
            var row = btn.closest('tr');
            // 检查是否关联了商品
            // 简单判断：如果 dataset.linked 为 true，或者内容列不包含 "待关联"
            var isLinked = row.dataset.linked === "true";
            var contentText = row.cells[4].innerText;
            
            // 兼容演示数据：演示数据默认认为是已关联的（如果已激活），或者是待关联的
            // 这里我们主要卡住那些明显显示 "待关联" 的
            if (!isLinked && contentText.includes('待关联')) {
                alert('无法激活！\n\n该批次尚未关联商品，请先点击“关联商品”按钮进行配置。');
                return;
            }
            
            // 调用原有逻辑
            if (!btn.id) btn.id = 'btn-activate-' + Date.now();
            document.getElementById('activate-target-btn-id').value = btn.id;
            openModal('activateConfirmModal');
        }