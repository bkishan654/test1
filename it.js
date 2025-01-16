return (
    <Row>
      <div class="container">
        <table
          style={{
            'min-width': '100%',
          }}
        >
          <tr
            style={{
              'text-align': 'center',
              height: '100%',
            }}
          >
            {schema.column.map((item, i) => (
              <td style={{ 'background-color': '#f3f3f3' }}>
                <div class="col-sm text-black" key={i}>
                  {`${item} ${2}`}
                </div>
              </td>
            ))}
            <td>
              <div class="col-sm bg-white text-white">ok</div>
            </td>
          </tr>

          {dataRows.length > 0
            ? dataRows.map((item, index) => (
                <tr>
                  {schema.column.map((elem, idx) => (
                    <td>
                      <div class="col-sm" key={idx}>
                        {elem == 'Config' ? (
                          <select
                            className="form-control rounded-0"
                            style={{ resize: 'both' }}
                            id={'dta_' + schema.DBIdentifier + elem + index}
                            value={`x${dataRows[index][elem]}`}
                            onChange={(event) => {
                              const value = parseInt(
                                event.target.value.replace('x', ''),
                                10
                              );
                              rowDataChanged(index, elem, value);
                            }}
                          >
                            <option value="">Select a value</option>
                            <option value="x4">x4</option>
                            <option value="x8">x8</option>
                            <option value="x16">x16</option>
                          </select>
                        ) : (
                          <textarea
                            class="form-control rounded-0 "
                            style={{ resize: 'both' }}
                            id={'dta_' + schema.DBIdentifier + elem + index}
                            rows="1"
                            value={dataRows[index][elem]}
                            onChange={(event) => {
                              console.log('hmm ', elem);
                              rowDataChanged(index, elem, event.target.value);
                            }}
                          >
                            {`${dataRows[index][elem]}`}
                          </textarea>
                        )}
                      </div>
                    </td>
                  ))}
                  <td>
                    <div class="col-sm text-danger">
                      <i
                        class="fa-thin fa-solid fa-circle-xmark"
                        style={{ 'margin-top': '40%' }}
                        onClick={() => removeRow(index)}
                      ></i>
                    </div>
                  </td>
                  <td></td>
                </tr>
              ))
            : ''}
          <tr>
            <div class="row col-7" style={{ 'padding-left': '2%' }}>
              <Button
                variant="primary"
                onClick={(e) => {
                  addNewRow(e);
                }}
                disabled={!lock}
                value={'test'}
              >
                Add New Row
              </Button>
            </div>
          </tr>
        </table>

      </div>
      
    </Row>
  );
