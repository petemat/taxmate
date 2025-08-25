'use client'

import { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { Receipt } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Filter,
  Edit,
  Eye,
  AlertTriangle,
  Trash2,
  Check,
  X,
  Loader2,
  Clock
} from 'lucide-react'

interface ReceiptTableProps {
  receipts: Receipt[]
  onEditReceipt: (receipt: Receipt) => void
  onViewReceipt: (receipt: Receipt) => void
  onDeleteReceipt: (receipt: Receipt) => void
}

export function ReceiptTable({ receipts, onEditReceipt, onViewReceipt, onDeleteReceipt }: ReceiptTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'date', desc: true }
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  const columns: ColumnDef<Receipt>[] = useMemo(
    () => [
      {
        accessorKey: 'type',
        header: 'Typ',
        cell: ({ row }) => {
          const type = row.getValue('type') as string
          return (
            <Badge variant={type === 'income' ? 'default' : 'secondary'}>
              {type === 'income' ? 'Einnahme' : 'Ausgabe'}
            </Badge>
          )
        },
        filterFn: 'equals',
      },
      {
        accessorKey: 'date',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              Datum
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          )
        },
        cell: ({ row }) => {
          const date = row.getValue('date') as string
          return date ? formatDate(date) : '-'
        },
      },
      {
        accessorKey: 'vendor',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2"
            >
              Dienstleister
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          )
        },
        cell: ({ row }) => {
          const vendor = row.getValue('vendor') as string
          const needsReview = row.original.needs_review
          const isProcessing = !vendor && !row.original.description && !row.original.gross_amount
          
          return (
            <div className="flex items-center space-x-2">
              {isProcessing ? (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="italic">Wird verarbeitet...</span>
                </div>
              ) : (
                <>
                  <span>{vendor || '-'}</span>
                  {needsReview && (
                    <div title="Überprüfung erforderlich">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </div>
                  )}
                </>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'description',
        header: 'Beschreibung',
        cell: ({ row }) => {
          const description = row.getValue('description') as string
          const isProcessing = !row.original.vendor && !description && !row.original.gross_amount
          
          return (
            <div className="max-w-[200px] truncate" title={description || ''}>
              {isProcessing ? (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="italic">Analysiert...</span>
                </div>
              ) : (
                description || '-'
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'gross_amount',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 justify-end"
            >
              Brutto
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          )
        },
        cell: ({ row }) => {
          const amount = row.getValue('gross_amount') as number
          const currency = row.original.currency || 'EUR'
          const isProcessing = !row.original.vendor && !row.original.description && !amount
          
          return (
            <div className="text-right font-medium">
              {isProcessing ? (
                <div className="flex items-center justify-end space-x-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="italic text-sm">...</span>
                </div>
              ) : (
                amount ? formatCurrency(amount, currency) : '-'
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'net_amount',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
              className="h-8 px-2 justify-end"
            >
              Netto
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          )
        },
        cell: ({ row }) => {
          const amount = row.getValue('net_amount') as number
          const currency = row.original.currency || 'EUR'
          const isProcessing = !row.original.vendor && !row.original.description && !row.original.gross_amount
          
          return (
            <div className="text-right">
              {isProcessing ? (
                <span className="text-muted-foreground italic text-sm">...</span>
              ) : (
                amount ? formatCurrency(amount, currency) : '-'
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'vat_amount',
        header: 'MwSt.',
        cell: ({ row }) => {
          const vatAmount = row.getValue('vat_amount') as number
          const currency = row.original.currency || 'EUR'
          const isProcessing = !row.original.vendor && !row.original.description && !row.original.gross_amount
          
          return (
            <div className="text-right">
              {isProcessing ? (
                <span className="text-muted-foreground italic text-sm">...</span>
              ) : (
                vatAmount ? formatCurrency(vatAmount, currency) : '-'
              )}
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => {
          return (
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewReceipt(row.original)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditReceipt(row.original)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              {confirmingDelete === row.original.id ? (
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      console.log('Delete confirmed for receipt:', row.original.id)
                      onDeleteReceipt(row.original)
                      setConfirmingDelete(null)
                    }}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingDelete(null)}
                    className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log('Delete button clicked for receipt:', row.original.id)
                    setConfirmingDelete(row.original.id)
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )
        },
      },
    ],
    [onEditReceipt, onViewReceipt, onDeleteReceipt, confirmingDelete]
  )

  const table = useReactTable({
    data: receipts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  const typeFilter = table.getColumn('type')?.getFilterValue() as string

  return (
    <Card>
      <CardHeader>
        <CardTitle>Belege</CardTitle>
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="flex space-x-2">
            <Button
              variant={typeFilter === 'income' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (typeFilter === 'income') {
                  table.getColumn('type')?.setFilterValue(undefined)
                } else {
                  table.getColumn('type')?.setFilterValue('income')
                }
              }}
              className="flex-1 sm:flex-none"
            >
              <Filter className="mr-2 h-4 w-4" />
              <span className="hidden xs:inline">Einnahmen</span>
              <span className="xs:hidden">Ein</span>
            </Button>
            <Button
              variant={typeFilter === 'expense' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (typeFilter === 'expense') {
                  table.getColumn('type')?.setFilterValue(undefined)
                } else {
                  table.getColumn('type')?.setFilterValue('expense')
                }
              }}
              className="flex-1 sm:flex-none"
            >
              <Filter className="mr-2 h-4 w-4" />
              <span className="hidden xs:inline">Ausgaben</span>
              <span className="xs:hidden">Aus</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Mobile Card View */}
        <div className="block sm:hidden space-y-3">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const receipt = row.original
              const isProcessing = !receipt.vendor && !receipt.description && !receipt.gross_amount
              
              return (
                <Card key={row.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={receipt.type === 'income' ? 'default' : 'secondary'}>
                        {receipt.type === 'income' ? 'Einnahme' : 'Ausgabe'}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {receipt.date ? formatDate(receipt.date) : '-'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-2">
                        {isProcessing ? (
                          <div className="flex items-center space-x-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="italic">Wird verarbeitet...</span>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium">{receipt.vendor || '-'}</span>
                            {receipt.needs_review && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            )}
                          </>
                        )}
                      </div>
                      {!isProcessing && receipt.description && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {receipt.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        {isProcessing ? (
                          <div className="flex items-center space-x-2 text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="italic text-sm">...</span>
                          </div>
                        ) : (
                          <div className="text-lg font-semibold">
                            {receipt.gross_amount ? formatCurrency(receipt.gross_amount, receipt.currency || 'EUR') : '-'}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => onViewReceipt(receipt)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onEditReceipt(receipt)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {confirmingDelete === receipt.id ? (
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                onDeleteReceipt(receipt)
                                setConfirmingDelete(null)
                              }}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmingDelete(null)}
                              className="text-gray-600 hover:text-gray-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmingDelete(receipt.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Keine Belege gefunden.
            </div>
          )}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden sm:block rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 text-left">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      Keine Belege gefunden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} von{' '}
            {table.getCoreRowModel().rows.length} Belegen
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
