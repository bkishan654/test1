import React, { useEffect, useState ,useRef, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/dist/styles/ag-grid.css'; // Core grid CSS, always needed
import 'ag-grid-community/dist/styles/ag-theme-alpine.css'; // Optional theme CSS
import productAttributeTasks from '../../../services/api/tasks/productAttributeTasks';
import { encryptText, decryptText } from '../../../services/aes';
import ProductNameRenderer from './ProductNameRenderer';
import BootstrapSwitchButton from 'bootstrap-switch-button-react';
import toast, { Toaster } from 'react-hot-toast';
import { checkRoles, sortuserrole } from '../../../services/agsRoles';
import { rolesInfo } from '../../../services/graphapi/roles';
import ModalEdit from '../../../components/BulkEdit/ModalEdit';
import temp from '../../assets/templates/Kit.json'

const isSystemAdmin = checkRoles(
  'SPARK Product Management System Admin',
  rolesInfo.roles
);

const roleRank = sortuserrole(rolesInfo.roles);

const username = process.env.REACT_APP_API_USERNAME;
const password = decryptText(process.env.REACT_APP_API_PASSWORD);

//to render row data
// const fetchTemplate = async (templateName) => {
//   try {
//     const response = await fetch(`/assets/templates/${templateName}.json?cache-bust=${new Date().getTime()}`, {
//       cache: "no-store"
//     });
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
//     const contentType = response.headers.get("content-type");
//     if (!contentType || !contentType.includes("application/json")) {
//       const text = await response.text(); // Read the response as text
//       console.error("Received non-JSON response:", text); // Log the response content
//       throw new TypeError("Received non-JSON response");
//     }
//     const template = await response.json();
//     return template;
//   } catch (error) {
//     console.error('Error fetching data:', error);
//     return null;
//   }
// };

// const extractAttributes = (template) => {
//   const attributes = [];
//   const traverse = (obj) => {
//     for (const key in obj) {
//       if (obj[key].properties) {
//         traverse(obj[key].properties);
//       } else if (key !== 'Speed Attribute') {
//         attributes.push(key);
//       }
//     }
//   };
//   traverse(template.properties);
//   return attributes;
// };

// const generateRows = async (productData, templateName) => {
//   const template = await fetchTemplate(templateName);
//   const attributes = extractAttributes(template);

//   const rows = Array.from(attributes).map((attr) => {
//     const row = { attribute: attr };
//     productData.forEach((product, index) => {
//       row[`product${index + 1}`] = product[attr] || '';
//     });
//     return row;
//   });
//   console.log("rows ",rows)
//   return rows;
// };
const BulkEditGrid = ({ test }) => {
  const gridRef = useRef();
  const [compareList, setCompareList] = useState(() => {
    const saved = window.localStorage.getItem('compareList');
    return saved ? JSON.parse(saved) : [];
  });
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [bulkEditEnabled, setbulkEditEnabled] = useState(false);
  const defaultColDef = useMemo(() => ({
    sortable: false,
    wrapText: true,
    autoHeight: true,
  }));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const responses = await Promise.all(
          compareList.map((item) =>
            productAttributeTasks.getProductAttributes(item, username, password)
          )
        );
        let count = 0;
        const attributes = new Set();
        const productData = responses.map((response) => {
          const productAttributes = {};
          response.rows.forEach((row) => {
            const attributeName = row.qualification.name;
            const attributeValue = row.values[2];
            const colID = row.object.label;
            productAttributes[attributeName] = attributeValue;
            attributes.add(attributeName);
          });
          return productAttributes;
        });


        const productType={}
        productData.map((response)=>{
            let product,type;
            product=response["MM Number"]
            type=response["Type"]
            productType[product]=type
        })

        const rows = Array.from(attributes).map((attr) => {
          const row = { attribute: attr };
          productData.forEach((product, index) => {
            row[`product${index + 1}`] = product[attr] || '';
            count = index;
          });
          return row;
        });

        // const rows=[]
        // for(let key in productType)
        // {
        //   let data=productData.find(product=>product["MM Number"]===key)
        //   let row=generateRows(data,productType[key])
        //   rows.push(row)
        // }

        setRowData(rows);
        // debugger;
        // const rows = [];
        // for (let key in productType) {
        //   let data = productData.find(product => product["MM Number"] === key);
        //   if (data) {
        //     const row = await generateRows([data], productType[key]);
        //     rows.push(...row);
        //   }
        // }
        // setRowData(rows);

        const ProductRow = rows.find((row) => row.attribute === 'Product Name');
        const ProductHeaders = [];
        if (ProductRow) {
          for (const key in ProductRow) {
            if (key.startsWith('product')) {
              ProductHeaders.push(ProductRow[key]);
            }
          }
          console.log(ProductHeaders);
          console.log("testing ",productType)
        }

        const columns = [
          { headerName: `${count + 1} products`, field: 'attribute' },
          ...productData.map((product, index) => ({
            headerName: ProductHeaders[index]
              ? `(${ProductHeaders[index]})`
              : `Product ${index + 1}`,
            field: `product${index + 1}`,
            headerComponent: ProductNameRenderer,
            headerComponentParams: {
              productId: `${
                product['MM Number'] ? product['MM Number'] : 'notSetYet'
              }`,
            
            },
            editable: true,
          })),
        ];

        setColumnDefs(columns);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [compareList, test]);

  return (
    <>
      <div
        className="col"
        style={{
          paddingBottom: '15px',
          paddingLeft: '15px',
          paddingRight: '15px',
          paddingTop: '15px',
        }}
      >
        {1 ? (
          <BootstrapSwitchButton
            checked={bulkEditEnabled}
            onlabel="Enable Bulk Edit"
            offlabel="Enable Bulk Edit"
            width={160}
            onstyle="primary"
            offstyle="info"
            onChange={(checked) => {
              setbulkEditEnabled(checked);
              if (checked) {
                toast.success('Enabled bulk edit.', {
                  position: 'top-right',
                  minWidth: '500px',
                });
              }
            }}
            style="bulkEditButton"
          />
        ) : null}
        {bulkEditEnabled ? (
          <span className="enable-bulkEdit">
            This page is in Bulk Edit mode
          </span>
        ) : (
          <span className="enable-bulkEdit">
            This page is not in Bulk Edit mode
          </span>
        )}
      </div>
      <div
        className="ag-theme-alpine"
        style={{
          height: 'calc(100vh - 20px)',
          width: 'calc(100% - 40px)',
          margin: '20px',
        }}
      >
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          colResizeDefault={columnDefs.colResizeDefault}
          headerHeight={120}
          headerwidth={300}
          alwaysShowVerticalScroll={true}
          ref={gridRef} // Ref for accessing Grid's API
          // colResizeDefault={columnData.colResizeDefault}
          // getRowHeight={getRowHeight}
          // suppressDragLeaveHidesColumns={true}
          // suppressFieldDotNotation={true}

          // defaultColDef={defaultColDef} // Default Column Properties
          // animateRows={true} // Optional - set to 'true' to have rows animate when sorted
          debounceVerticalScrollbar={true}
          enableCellTextSelection="true"
          // onCellClicked={cellClickedListener} // Optional - registering for Grid Event
          // onGridReady={onGridReadyTasks}
          // rowClassRules={rowClassRules}
          overlayNoRowsTemplate={'Loading the Product data'}
          // suppressColumnVirtualisation={true}
          // pinnedTopRowData={PinnedTopRowData}
          // getRowStyle={getRowStyle}
          enableColResize={true}
          allowResizing={true}
          suppressAutoSize={true}
        />
      </div>
    </>
  );
};

export default BulkEditGrid;
