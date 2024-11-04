import React, { useEffect, useState, useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css'; // Core grid CSS, always needed
import 'ag-grid-community/dist/styles/ag-theme-alpine.css'; // Optional theme CSS
import productAttributeTasks from '../../../services/api/tasks/productAttributeTasks';
import { decryptText } from '../../../services/aes';
import ProductNameRenderer from './ProductNameRenderer';
import BootstrapSwitchButton from 'bootstrap-switch-button-react';
import toast from 'react-hot-toast';
import { checkRoles, sortuserrole } from '../../../services/agsRoles';
import { rolesInfo } from '../../../services/graphapi/roles';
import ModalEdit from '../../../components/BulkEdit/ModalEdit';
import Modal from 'react-modal';

const BulkEditGrid = () => {
  const gridRef = useRef();
  const [compareList, setCompareList] = useState(() => {
    const saved = window.localStorage.getItem('compareList');
    return saved ? JSON.parse(saved) : [];
  });
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [bulkEditEnabled, setBulkEditEnabled] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState({});
  
  const username = process.env.REACT_APP_API_USERNAME;
  const password = decryptText(process.env.REACT_APP_API_PASSWORD);

  const defaultColDef = useMemo(() => ({
    sortable: false,
    wrapText: true,
    autoHeight: true,
  }), []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCell({});
  };

  useEffect(() => {
    const fetchData = async () => {
      if (compareList.length === 0) return;

      try {
        const responses = await Promise.all(
          compareList.map((item) =>
            productAttributeTasks.getProductAttributes(item, username, password)
          )
        );

        const productData = responses.map((response) => {
          const productAttributes = {};
          response.rows.forEach((row) => {
            productAttributes[row.qualification.name] = row.values[2];
          });
          return productAttributes;
        });

        const attributes = Array.from(new Set(productData.flatMap(Object.keys)));

        const rows = attributes.map((attr) => {
          const row = { attribute: attr };
          productData.forEach((product, index) => {
            row[`product${index + 1}`] = product[attr] || '';
          });
          return row;
        });

        setRowData(rows);

        const columns = [
          { headerName: 'Attributes', field: 'attribute', editable: false },
          ...productData.map((product, index) => ({
            headerName: `Product ${index + 1}`,
            field: `product${index + 1}`,
            headerComponent: ProductNameRenderer,
            editable: true,
          })),
        ];

        setColumnDefs(columns);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load product attributes.');
      }
    };

    fetchData();
  }, [compareList]);

  const handleCellClick = (params) => {
    setSelectedCell({
      rowIndex: params.rowIndex,
      colId: params.colDef.field,
      value: params.value,
    });
    openModal();
  };

  const handleSave = async (newValue) => {
    const updatedRowData = [...rowData];
    updatedRowData[selectedCell.rowIndex][selectedCell.colId] = newValue;
    setRowData(updatedRowData);
    closeModal();

    try {
      await productAttributeTasks.updateProductAttribute(
        updatedRowData[selectedCell.rowIndex]['MM Number'],
        selectedCell.colId,
        newValue,
        username,
        password
      );
      toast.success('Attribute updated successfully.');
    } catch (error) {
      console.error('Error updating attribute:', error);
      toast.error('Failed to update attribute.');
    }
  };

  return (
    <>
      <div style={{ padding: '15px' }}>
        <BootstrapSwitchButton
          checked={bulkEditEnabled}
          onlabel="Enable Bulk Edit"
          offlabel="Disable Bulk Edit"
          width={160}
          onstyle="primary"
          offstyle="info"
          onChange={(checked) => {
            setBulkEditEnabled(checked);
            toast.success(checked ? 'Enabled bulk edit.' : 'Disabled bulk edit.');
          }}
        />
        <span className="enable-bulkEdit">
          This page is {bulkEditEnabled ? 'in' : 'not in'} Bulk Edit mode
        </span>
      </div>

      <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 80px)', margin: '20px' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onCellClicked={handleCellClick}
          overlayNoRowsTemplate={'Loading the Product data...'}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Edit Product Attribute"
        style={{
          content: {
            top: '40%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
          },
        }}
      >
        <div>
          <strong>{selectedCell.value}</strong>
          <ModalEdit
            onCloseModal={closeModal}
            onSaveModal={handleSave}
            currentEvent={selectedCell}
          />
        </div>
      </Modal>
    </>
  );
};

export default BulkEditGrid;
