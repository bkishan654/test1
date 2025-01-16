{dataRows.map((item, index) => (
  <tr key={`row-${index}`}>
    {schema.column.map((elem, idx) => (
      <td key={`col-${idx}`}>
        <div class="col-sm">
          {elem === 'Config' ? (
            <select
              className="form-control rounded-0"
              style={{ resize: 'both' }}
              id={`dta_${schema.DBIdentifier}${elem}${index}`}
              value={`x${dataRows[index][elem]}`}
              onChange={(event) => {
                const value = parseInt(event.target.value.replace('x', ''), 10);
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
              class="form-control rounded-0"
              style={{ resize: 'both' }}
              id={`dta_${schema.DBIdentifier}${elem}${index}`}
              rows="1"
              value={dataRows[index][elem]}
              onChange={(event) => {
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
      <Button
        variant="primary"
        onClick={() => handleButtonClick(index)}
      >
        Click Me
      </Button>
    </td>
  </tr>
))}
