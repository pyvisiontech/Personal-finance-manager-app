import { supabase } from '../lib/supabase';
import { TransactionWithCategory } from '../lib/types';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import JSZip from 'jszip';
import { DownloadManager } from './DownloadManagerModule';

/**
 * Fetches all transactions for a specific statement
 */
export async function fetchStatementTransactions(
  userId: string,
  statementId: string,
  statementCreatedAt: string,
  statementProcessedAt: string | null
): Promise<TransactionWithCategory[]> {
  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        category_user:category_user_id (
          id,
          name,
          icon
        ),
        category_ai:category_ai_id (
          id,
          name,
          icon
        )
      `)
      .eq('user_id', userId)
      .eq('source', 'statement');
    
    // Use statement_import_id (file_id) for direct mapping if column exists
    // Fallback to timestamp matching for backward compatibility
    try {
      // Try to use statement_import_id first (proper direct link)
      query = query.eq('statement_import_id', statementId);
    } catch (queryError) {
      // If statement_import_id column doesn't exist yet, use timestamp fallback
      console.warn('statement_import_id column not found, using timestamp fallback');
      query = query.gte('created_at', statementCreatedAt);
    }

    const { data, error } = await query.order('occurred_at', { ascending: false });

    if (error) {
      // If error is about missing column, fallback to timestamp method
      if (error.message?.includes('statement_import_id') || error.message?.includes('column')) {
        console.warn('statement_import_id column not found, using timestamp fallback');
        const fallbackQuery = supabase
          .from('transactions')
          .select(`
            *,
            category_user:category_user_id (
              id,
              name,
              icon
            ),
            category_ai:category_ai_id (
              id,
              name,
              icon
            )
          `)
          .eq('user_id', userId)
          .eq('source', 'statement')
          .gte('created_at', statementCreatedAt);
        
        const { data: fallbackData, error: fallbackError } = await fallbackQuery.order('occurred_at', { ascending: false });
        
        if (fallbackError) {
          console.error('Error fetching statement transactions (fallback):', fallbackError);
          throw new Error(`Failed to fetch transactions: ${fallbackError.message}`);
        }
        
        const transactions = (fallbackData || []) as TransactionWithCategory[];
        console.log(`Found ${transactions.length} transactions for statement ${statementId} (using timestamp fallback)`);
        return transactions;
      }
      
      console.error('Error fetching statement transactions:', error);
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    const transactions = (data || []) as TransactionWithCategory[];

    console.log(`Found ${transactions.length} transactions for statement ${statementId} (using statement_import_id)`);

    return transactions;
  } catch (error) {
    console.error('Error in fetchStatementTransactions:', error);
    throw error;
  }
}

/**
 * Groups transactions by category
 */
function groupTransactionsByCategory(
  transactions: TransactionWithCategory[]
): Map<string, TransactionWithCategory[]> {
  const grouped = new Map<string, TransactionWithCategory[]>();

  transactions.forEach((transaction) => {
    const category = transaction.category_user || transaction.category_ai;
    const categoryId = category?.id || 'uncategorized';

    if (!grouped.has(categoryId)) {
      grouped.set(categoryId, []);
    }
    grouped.get(categoryId)!.push(transaction);
  });

  return grouped;
}

/**
 * Escapes XML special characters
 */
function escapeXml(text: any): string {
  if (text === null || text === undefined) {
    return '';
  }
  const str = String(text);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Creates Excel cell XML
 */
function createCell(col: string, row: number, value: string | number, type: 's' | 'n' = 's'): string {
  const cellRef = `${col}${row}`;
  if (type === 'n') {
    // Number cell
    return `<c r="${cellRef}" t="n"><v>${value}</v></c>`;
  }
  // String cell (value is shared string index)
  return `<c r="${cellRef}" t="s"><v>${value}</v></c>`;
}

/**
 * Creates Excel row XML
 */
function createRow(rowNum: number, cells: string[]): string {
  if (cells.length === 0) {
    // Empty row - still need to create valid XML
    return `<row r="${rowNum}"/>`;
  }
  return `<row r="${rowNum}">${cells.join('')}</row>`;
}

/**
 * Exports transactions to Excel file with two sheets using JSZip
 * Manually constructs XLSX file structure to avoid xlsx library bugs
 */
export async function exportStatementToExcel(
  transactions: TransactionWithCategory[],
  statementFileName: string
): Promise<{ fileUri: string; fileName: string }> {
  if (transactions.length === 0) {
    throw new Error('No transactions found for this statement');
  }

  const groupedTransactions = groupTransactionsByCategory(transactions);
  const zip = new JSZip();

  // Shared strings for both sheets
  const sharedStrings: string[] = [];
  const stringMap = new Map<string, number>();

  function getStringIndex(str: string): number {
    if (stringMap.has(str)) {
      return stringMap.get(str)!;
    }
    const index = sharedStrings.length;
    sharedStrings.push(str);
    stringMap.set(str, index);
    return index;
  }

  // ===== SHEET 1: Summary =====
  const summaryRows: string[] = [];
  let summaryRowNum = 1;

  // Row 1: Title
  const titleIdx = getStringIndex('Statement Export Summary');
  summaryRows.push(createRow(summaryRowNum++, [createCell('A', 1, titleIdx)]));

  // Row 2: Total Transactions
  const totalTransIdx = getStringIndex('Total Transactions');
  summaryRows.push(createRow(summaryRowNum++, [
    createCell('A', 2, totalTransIdx),
    createCell('B', 2, transactions.length, 'n')
  ]));

  // Row 3: Total Categories
  const totalCatIdx = getStringIndex('Total Categories');
  summaryRows.push(createRow(summaryRowNum++, [
    createCell('A', 3, totalCatIdx),
    createCell('B', 3, groupedTransactions.size, 'n')
  ]));

  // Row 4: Empty row with empty cells
  summaryRows.push(createRow(summaryRowNum++, [
    createCell('A', 4, getStringIndex('')),
    createCell('B', 4, getStringIndex('')),
    createCell('C', 4, getStringIndex(''))
  ]));

  // Row 5: Headers
  const catHeaderIdx = getStringIndex('Category');
  const countHeaderIdx = getStringIndex('Transaction Count');
  const amountHeaderIdx = getStringIndex('Total Amount');
  summaryRows.push(createRow(summaryRowNum++, [
    createCell('A', 5, catHeaderIdx),
    createCell('B', 5, countHeaderIdx),
    createCell('C', 5, amountHeaderIdx)
  ]));

  // Category rows
  groupedTransactions.forEach((categoryTransactions) => {
    const category = categoryTransactions[0].category_user || categoryTransactions[0].category_ai;
    const categoryName = category?.name || 'Uncategorized';
    const totalAmount = categoryTransactions.reduce(
      (sum, t) => sum + (t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount)),
      0
    );

    const catNameIdx = getStringIndex(categoryName);
    summaryRows.push(createRow(summaryRowNum++, [
      createCell('A', summaryRowNum - 1, catNameIdx),
      createCell('B', summaryRowNum - 1, categoryTransactions.length, 'n'),
      createCell('C', summaryRowNum - 1, Math.round(totalAmount * 100) / 100, 'n')
    ]));
  });

  // Calculate summary sheet dimensions
  const summaryLastRow = summaryRowNum - 1;
  const summarySheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="A1:C${summaryLastRow}"/>
<sheetViews>
<sheetView workbookViewId="0"/>
</sheetViews>
<sheetData>
${summaryRows.join('\n')}
</sheetData>
</worksheet>`;

  // ===== SHEET 2: Transactions =====
  const transactionRows: string[] = [];
  let transRowNum = 1;

  // Header row
  const headers = ['Date', 'Description', 'Category', 'Type', 'Amount', 'Currency'];
  const headerIndices = headers.map(h => getStringIndex(h));
  transactionRows.push(createRow(transRowNum++, [
    createCell('A', 1, headerIndices[0]),
    createCell('B', 1, headerIndices[1]),
    createCell('C', 1, headerIndices[2]),
    createCell('D', 1, headerIndices[3]),
    createCell('E', 1, headerIndices[4]),
    createCell('F', 1, headerIndices[5])
  ]));

  // Transaction rows
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );

  sortedTransactions.forEach((transaction, index) => {
    const category = transaction.category_user || transaction.category_ai;
    const categoryName = category?.name || 'Uncategorized';
    const date = new Date(transaction.occurred_at).toLocaleDateString();
    const description = transaction.raw_description || transaction.merchant || 'N/A';

    const dateIdx = getStringIndex(date);
    const descIdx = getStringIndex(description);
    const catIdx = getStringIndex(categoryName);
    const typeIdx = getStringIndex(transaction.type || '');
    const currencyIdx = getStringIndex(transaction.currency || 'INR');

    transRowNum++;
    transactionRows.push(createRow(transRowNum - 1, [
      createCell('A', transRowNum - 1, dateIdx),
      createCell('B', transRowNum - 1, descIdx),
      createCell('C', transRowNum - 1, catIdx),
      createCell('D', transRowNum - 1, typeIdx),
      createCell('E', transRowNum - 1, Math.round((transaction.amount || 0) * 100) / 100, 'n'),
      createCell('F', transRowNum - 1, currencyIdx)
    ]));
  });

  // Calculate transactions sheet dimensions
  const transLastRow = transRowNum - 1;
  const transactionsSheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<dimension ref="A1:F${transLastRow}"/>
<sheetViews>
<sheetView workbookViewId="0"/>
</sheetViews>
<sheetData>
${transactionRows.join('\n')}
</sheetData>
</worksheet>`;

  // ===== Create XLSX file structure =====
  
  // [Content_Types].xml
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  // _rels/.rels
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  // xl/workbook.xml
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<workbookPr/>
<sheets>
<sheet name="Summary" sheetId="1" r:id="rId1"/>
<sheet name="Transactions" sheetId="2" r:id="rId2"/>
</sheets>
</workbook>`;

  // xl/_rels/workbook.xml.rels
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  // xl/styles.xml (required by Excel)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="0"/>
<fonts count="1">
<font>
<sz val="11"/>
<color theme="1"/>
<name val="Calibri"/>
<family val="2"/>
<scheme val="minor"/>
</font>
</fonts>
<fills count="1">
<fill>
<patternFill patternType="none"/>
</fill>
</fills>
<borders count="1">
<border>
<left/>
<right/>
<top/>
<bottom/>
<diagonal/>
</border>
</borders>
<cellStyleXfs count="1">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
</cellStyleXfs>
<cellXfs count="1">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
</cellXfs>
</styleSheet>`;

  // xl/sharedStrings.xml
  // If no shared strings, create empty shared strings file
  const sharedStringsXml = sharedStrings.length > 0
    ? `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">
${sharedStrings.map(s => `<si><t>${escapeXml(s)}</t></si>`).join('\n')}
</sst>`
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>`;

  // Add files to zip
  zip.file('[Content_Types].xml', contentTypes);
  zip.file('_rels/.rels', rels);
  zip.file('xl/workbook.xml', workbook);
  zip.file('xl/_rels/workbook.xml.rels', workbookRels);
  zip.file('xl/sharedStrings.xml', sharedStringsXml);
  zip.file('xl/styles.xml', stylesXml);
  zip.file('xl/worksheets/sheet1.xml', summarySheetXml);
  zip.file('xl/worksheets/sheet2.xml', transactionsSheetXml);

  // Generate zip file as base64
  const zipBlob = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });

  console.log('ZIP file generated, size:', zipBlob.length);
  console.log('Shared strings count:', sharedStrings.length);
  console.log('Summary rows:', summaryRowNum - 1);
  console.log('Transaction rows:', transRowNum - 1);

  // ===== SAVE FILE =====
  const fileName = `Statement_${statementFileName.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.xlsx`;
  const directory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  
  if (!directory) {
    throw new Error('Unable to determine file system directory');
  }

  const fileUri = `${directory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, zipBlob, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // ===== VERIFY FILE =====
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  console.log('=== FILE DEBUG ===');
  console.log('File URI:', fileUri);
  console.log('File exists:', fileInfo.exists);
  if (fileInfo.exists && 'size' in fileInfo) {
    console.log('File size:', fileInfo.size, 'bytes');
    console.log('✅ File created successfully!');
  }

  return { fileUri, fileName };
}

/**
 * Downloads the Excel file using SAF (Storage Access Framework) on Android
 * or sharing dialog on iOS
 */
export async function downloadStatementExcel(
  fileUri: string,
  fileName: string
): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      // Try to use SAF (Storage Access Framework) for Android - shows save location picker
      try {
        await DownloadManager.saveFileWithPicker(fileUri, fileName);
        return; // Success, exit early
      } catch (nativeError: any) {
        // If native module is not available, fall back to sharing
        if (nativeError?.message?.includes('not available') || nativeError?.message?.includes('DownloadManagerModule')) {
          console.warn('Native DownloadManager not available, falling back to sharing dialog');
          // Fall through to sharing dialog
        } else {
          // Re-throw other errors (like user cancellation)
          if (nativeError?.code === 'USER_CANCELLED' || nativeError?.message?.includes('cancelled')) {
            console.log('User cancelled file save');
            return;
          }
          throw nativeError;
        }
      }
    }
    
    // Fallback to sharing dialog (iOS or Android if native module unavailable)
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Save ${fileName}`,
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error: any) {
    // If user cancelled, don't show error
    if (error?.code === 'USER_CANCELLED' || error?.message?.includes('cancelled')) {
      console.log('User cancelled file save');
      return;
    }
    console.error('Error saving file:', error);
    throw error;
  }
}
