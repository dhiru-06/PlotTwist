import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleCheckFilled,
  IconDotsVertical,
  IconGripVertical,
  IconLoader,
  IconPlus,
  IconSettings2,
  IconTrendingUp,
  IconX,
} from "@tabler/icons-react"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import type { CheckedState } from "@radix-ui/react-checkbox"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"

import { useAuth } from "@/hooks/useAuth"
import { useIsMobile } from "@/hooks/use-mobile"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
} from "@/components/ui/tabs"

export const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
})

type SectionRecord = {
  id: string
  name: string
  slug: string
  sort_order: number
  is_default: boolean
}

type CustomView = {
  value: string
  label: string
  slug: string
  sortOrder: number
}

type SectionBookRecord = {
  id: string
  section_id: string
  title: string
  author: string | null
  cover_url: string | null
  rating: number | null
  notes: string | null
}

// Create a separate component for the drag handle
function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="text-muted-foreground size-7 hover:bg-transparent"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

const columns: ColumnDef<z.infer<typeof schema>>[] = [
  {
    id: "drag",
    header: () => null,
    cell: ({ row }) => <DragHandle id={row.original.id} />,
  },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value: CheckedState) =>
            table.toggleAllPageRowsSelected(!!value)
          }
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value: CheckedState) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "header",
    header: "Header",
    cell: ({ row }) => {
      return <TableCellViewer item={row.original} />
    },
    enableHiding: false,
  },
  {
    accessorKey: "type",
    header: "Section Type",
    cell: ({ row }) => (
      <div className="w-32">
        <Badge variant="outline" className="text-muted-foreground px-1.5">
          {row.original.type}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-muted-foreground px-1.5">
        {row.original.status === "Done" ? (
          <IconCircleCheckFilled className="fill-green-500 dark:fill-green-400" />
        ) : (
          <IconLoader />
        )}
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "target",
    header: () => <div className="w-full text-right">Target</div>,
    cell: ({ row }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: `Saving ${row.original.header}`,
            success: "Done",
            error: "Error",
          })
        }}
      >
        <Label htmlFor={`${row.original.id}-target`} className="sr-only">
          Target
        </Label>
        <Input
          className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-right shadow-none focus-visible:border dark:bg-transparent"
          defaultValue={row.original.target}
          id={`${row.original.id}-target`}
        />
      </form>
    ),
  },
  {
    accessorKey: "limit",
    header: () => <div className="w-full text-right">Limit</div>,
    cell: ({ row }) => (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1000)), {
            loading: `Saving ${row.original.header}`,
            success: "Done",
            error: "Error",
          })
        }}
      >
        <Label htmlFor={`${row.original.id}-limit`} className="sr-only">
          Limit
        </Label>
        <Input
          className="hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 h-8 w-16 border-transparent bg-transparent text-right shadow-none focus-visible:border dark:bg-transparent"
          defaultValue={row.original.limit}
          id={`${row.original.id}-limit`}
        />
      </form>
    ),
  },
  {
    accessorKey: "reviewer",
    header: "Reviewer",
    cell: ({ row }) => {
      const isAssigned = row.original.reviewer !== "Assign reviewer"

      if (isAssigned) {
        return row.original.reviewer
      }

      return (
        <>
          <Label htmlFor={`${row.original.id}-reviewer`} className="sr-only">
            Reviewer
          </Label>
          <Select>
            <SelectTrigger
              className="w-38 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
              size="sm"
              id={`${row.original.id}-reviewer`}
            >
              <SelectValue placeholder="Assign reviewer" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
              <SelectItem value="Jamik Tashpulatov">
                Jamik Tashpulatov
              </SelectItem>
            </SelectContent>
          </Select>
        </>
      )
    },
  },
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
            size="icon"
          >
            <IconDotsVertical />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuItem>Make a copy</DropdownMenuItem>
          <DropdownMenuItem>Favorite</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

function DraggableRow({ row }: { row: Row<z.infer<typeof schema>> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })

  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[]
}) {
  const { user } = useAuth()
  const isMobile = useIsMobile()

  const [data, setData] = React.useState(() => initialData)
  const [activeView, setActiveView] = React.useState("")
  const [defaultViews, setDefaultViews] = React.useState<CustomView[]>([])
  const [customViews, setCustomViews] = React.useState<CustomView[]>([])
  const [isSectionsLoading, setIsSectionsLoading] = React.useState(false)
  const [isSubmittingSection, setIsSubmittingSection] = React.useState(false)
  const [isSectionBooksLoading, setIsSectionBooksLoading] = React.useState(false)
  const [sectionBooks, setSectionBooks] = React.useState<SectionBookRecord[]>([])
  const [sectionBooksRefreshKey, setSectionBooksRefreshKey] = React.useState(0)
  const [isSectionManagerOpen, setIsSectionManagerOpen] = React.useState(false)
  const [sectionMode, setSectionMode] = React.useState<"create" | "edit">(
    "create"
  )
  const [selectedSectionId, setSelectedSectionId] = React.useState<string | null>(
    null
  )
  const [sectionName, setSectionName] = React.useState("")
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data?.map(({ id }) => id) || [],
    [data]
  )

  const allViews = React.useMemo(
    () => [...defaultViews, ...customViews],
    [defaultViews, customViews]
  )
  const defaultViewIds = React.useMemo(
    () => new Set(defaultViews.map((view) => view.value)),
    [defaultViews]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  React.useEffect(() => {
    let isCancelled = false

    async function loadSections() {
      if (!user) {
        setActiveView("")
        setDefaultViews([])
        setCustomViews([])
        return
      }

      setIsSectionsLoading(true)

      const { data: sections, error } = await supabase
        .from("sections")
        .select("id, name, slug, sort_order, is_default")
        .eq("profile_id", user.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })

      if (isCancelled) return

      setIsSectionsLoading(false)

      if (error) {
        toast.error("Failed to load sections")
        return
      }

      const mappedDefaultViews = (sections ?? [])
        .filter((section: SectionRecord) => section.is_default)
        .map((section: SectionRecord) => ({
          value: section.id,
          label: section.name,
          slug: section.slug,
          sortOrder: section.sort_order,
        }))

      const mappedCustomViews = (sections ?? [])
        .filter((section: SectionRecord) => !section.is_default)
        .map((section: SectionRecord) => ({
          value: section.id,
          label: section.name,
          slug: section.slug,
          sortOrder: section.sort_order,
        }))

      const defaultSection = (sections ?? []).find(
        (section: SectionRecord) => section.is_default
      )

      setDefaultViews(mappedDefaultViews)
      setCustomViews(mappedCustomViews)

      const fallbackViewId =
        defaultSection?.id ??
        mappedDefaultViews[0]?.value ??
        mappedCustomViews[0]?.value ??
        ""

      setActiveView(fallbackViewId)
    }

    void loadSections()

    return () => {
      isCancelled = true
    }
  }, [user])

  React.useEffect(() => {
    let isCancelled = false

    async function loadSectionBooks() {
      if (!user || allViews.length === 0) {
        setSectionBooks([])
        return
      }

      setIsSectionBooksLoading(true)

      const sectionIds = allViews.map((view) => view.value)

      const { data: books, error } = await supabase
        .from("section_books")
        .select("id, section_id, title, author, cover_url, rating, notes")
        .eq("profile_id", user.id)
        .in("section_id", sectionIds)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })

      if (isCancelled) return

      setIsSectionBooksLoading(false)

      if (error) {
        toast.error("Failed to load section books")
        return
      }

      setSectionBooks((books ?? []) as SectionBookRecord[])
    }

    void loadSectionBooks()

    return () => {
      isCancelled = true
    }
  }, [user, allViews, sectionBooksRefreshKey])

  React.useEffect(() => {
    function handleSectionBooksChanged() {
      setSectionBooksRefreshKey((prev) => prev + 1)
    }

    window.addEventListener("section-books-changed", handleSectionBooksChanged)

    return () => {
      window.removeEventListener("section-books-changed", handleSectionBooksChanged)
    }
  }, [])

  async function handleSaveSectionBook(bookId: string) {
    if (!user) {
      toast.error("Please sign in to update books")
      return
    }

    const book = sectionBooks.find((item) => item.id === bookId)
    if (!book) return

    const { error } = await supabase
      .from("section_books")
      .update({
        rating: book.rating,
        notes: book.notes?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookId)
      .eq("profile_id", user.id)

    if (error) {
      toast.error("Failed to save book changes")
      return
    }

    toast.success("Book updated")
  }

  async function handleDeleteSectionBook(bookId: string) {
    if (!user) {
      toast.error("Please sign in to remove books")
      return
    }

    const { error } = await supabase
      .from("section_books")
      .delete()
      .eq("id", bookId)
      .eq("profile_id", user.id)

    if (error) {
      toast.error("Failed to remove book")
      return
    }

    setSectionBooks((prev) => prev.filter((book) => book.id !== bookId))
    toast.success("Book removed")
  }

  function handleSectionBookRatingChange(bookId: string, value: string) {
    setSectionBooks((prev) =>
      prev.map((book) => {
        if (book.id !== bookId) return book

        if (value.trim() === "") {
          return {
            ...book,
            rating: null,
          }
        }

        const parsed = Number(value)
        if (Number.isNaN(parsed)) return book

        return {
          ...book,
          rating: Math.min(5, Math.max(0, parsed)),
        }
      })
    )
  }

  function handleSectionBookNotesChange(bookId: string, notes: string) {
    setSectionBooks((prev) =>
      prev.map((book) =>
        book.id === bookId
          ? {
            ...book,
            notes,
          }
          : book
      )
    )
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id)
        const newIndex = dataIds.indexOf(over.id)
        return arrayMove(data, oldIndex, newIndex)
      })
    }
  }

  function resetSectionForm() {
    setSectionMode("create")
    setSelectedSectionId(null)
    setSectionName("")
  }

  function handleOpenSectionManager() {
    resetSectionForm()
    setIsSectionManagerOpen(true)
  }

  function handleCloseSectionManager(open: boolean) {
    setIsSectionManagerOpen(open)

    if (!open) {
      resetSectionForm()
    }
  }

  function slugifySectionName(name: string) {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")

    return slug || "section"
  }

  async function getUniqueSlug(name: string, excludeSectionId?: string | null) {
    if (!user) return slugifySectionName(name)

    const baseSlug = slugifySectionName(name)

    const { data: existingSections, error } = await supabase
      .from("sections")
      .select("id, slug")
      .eq("profile_id", user.id)
      .ilike("slug", `${baseSlug}%`)

    if (error) {
      return baseSlug
    }

    const usedSlugs = new Set(
      (existingSections ?? [])
        .filter((section: { id: string; slug: string }) => section.id !== excludeSectionId)
        .map((section: { id: string; slug: string }) => section.slug)
    )

    if (!usedSlugs.has(baseSlug)) {
      return baseSlug
    }

    let suffix = 2
    let candidate = `${baseSlug}-${suffix}`

    while (usedSlugs.has(candidate)) {
      suffix += 1
      candidate = `${baseSlug}-${suffix}`
    }

    return candidate
  }

  async function handleSubmitSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!user) {
      toast.error("Please sign in to manage sections")
      return
    }

    const trimmedName = sectionName.trim()

    if (!trimmedName) {
      toast.error("Section name is required")
      return
    }

    setIsSubmittingSection(true)

    if (sectionMode === "create") {
      const nextSortOrder =
        customViews.length > 0
          ? Math.max(...customViews.map((view) => view.sortOrder)) + 1
          : 0

      const uniqueSlug = await getUniqueSlug(trimmedName)

      const { data: createdSection, error } = await supabase
        .from("sections")
        .insert({
          profile_id: user.id,
          name: trimmedName,
          slug: uniqueSlug,
          sort_order: nextSortOrder,
          is_default: false,
        })
        .select("id, name, slug, sort_order")
        .single()

      if (error || !createdSection) {
        setIsSubmittingSection(false)
        toast.error("Failed to create section")
        return
      }

      const nextView: CustomView = {
        value: createdSection.id,
        label: createdSection.name,
        slug: createdSection.slug,
        sortOrder: createdSection.sort_order,
      }

      setCustomViews((prev) => [...prev, nextView])
      setActiveView(nextView.value)
      setIsSubmittingSection(false)
      toast.success("Section created")
      resetSectionForm()
      return
    }

    if (!selectedSectionId) {
      setIsSubmittingSection(false)
      return
    }

    const uniqueSlug = await getUniqueSlug(trimmedName, selectedSectionId)

    const { data: updatedSection, error } = await supabase
      .from("sections")
      .update({
        name: trimmedName,
        slug: uniqueSlug,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedSectionId)
      .eq("profile_id", user.id)
      .select("id, name, slug, sort_order")
      .single()

    if (error || !updatedSection) {
      setIsSubmittingSection(false)
      toast.error("Failed to update section")
      return
    }

    setCustomViews((prev) =>
      prev.map((view) =>
        view.value === selectedSectionId
          ? {
            ...view,
            label: updatedSection.name,
            slug: updatedSection.slug,
            sortOrder: updatedSection.sort_order,
          }
          : view
      )
    )

    setDefaultViews((prev) =>
      prev.map((view) =>
        view.value === selectedSectionId
          ? {
            ...view,
            label: updatedSection.name,
            slug: updatedSection.slug,
            sortOrder: updatedSection.sort_order,
          }
          : view
      )
    )

    setIsSubmittingSection(false)
    toast.success("Section updated")
    resetSectionForm()
  }

  async function handleDeleteSection(value: string) {
    if (!user) {
      toast.error("Please sign in to manage sections")
      return
    }

    if (defaultViewIds.has(value)) {
      toast.error("Default sections cannot be deleted")
      return
    }

    const { error } = await supabase
      .from("sections")
      .delete()
      .eq("id", value)
      .eq("profile_id", user.id)

    if (error) {
      toast.error("Failed to delete section")
      return
    }

    setCustomViews((prev) => prev.filter((view) => view.value !== value))

    if (selectedSectionId === value) {
      resetSectionForm()
    }

    if (activeView === value) {
      setActiveView(defaultViews[0]?.value ?? customViews[0]?.value ?? "")
    }

    toast.success("Section deleted")
  }

  function handleEditSection(view: { value: string; label: string }) {
    setSectionMode("edit")
    setSelectedSectionId(view.value)
    setSectionName(view.label)
  }

  return (
    <Tabs
      value={activeView}
      onValueChange={setActiveView}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select value={activeView} onValueChange={setActiveView}>
          <SelectTrigger className="flex w-fit min-w-52" size="sm" id="view-selector">
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            {allViews.map((view) => (
              <SelectItem key={view.value} value={view.value}>
                {view.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleOpenSectionManager}>
            <IconSettings2 />
            <span className="hidden lg:inline">Manage Sections</span>
          </Button>
        </div>
      </div>
      <Drawer
        direction={isMobile ? "bottom" : "right"}
        open={isSectionManagerOpen}
        onOpenChange={handleCloseSectionManager}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {sectionMode === "create" ? "Create Section" : "Edit Section"}
            </DrawerTitle>
            <DrawerDescription>
              Add new sections or manage existing custom sections.
            </DrawerDescription>
          </DrawerHeader>
          <div className="space-y-6 px-4 text-sm">
            <form className="space-y-3" onSubmit={handleSubmitSection}>
              <Label htmlFor="section-name">
                {sectionMode === "create" ? "Section name" : "Rename section"}
              </Label>
              <Input
                id="section-name"
                value={sectionName}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setSectionName(event.target.value)
                }
                placeholder="Enter section name"
              />
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={isSubmittingSection}>
                  {sectionMode === "create" ? "Create Section" : "Save Changes"}
                </Button>
                {sectionMode === "edit" && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetSectionForm}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
            <Separator />
            <div className="space-y-2 pb-2">
              <div className="text-muted-foreground text-xs font-medium uppercase">
                Existing sections
              </div>
              {isSectionsLoading ? (
                <div className="text-muted-foreground rounded-md border border-dashed p-3">
                  Loading sections...
                </div>
              ) : allViews.length === 0 ? (
                <div className="text-muted-foreground rounded-md border border-dashed p-3">
                  No sections yet.
                </div>
              ) : (
                allViews.map((view) => {
                  const isDefaultSection = defaultViewIds.has(view.value)

                  return (
                    <div
                      key={view.value}
                      className="bg-background flex items-center gap-2 rounded-md border p-2"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveView(view.value)}
                        className="hover:text-foreground flex-1 truncate text-left"
                      >
                        {view.label}
                      </button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => handleEditSection(view)}
                      >
                        Edit
                      </Button>
                      {!isDefaultSection && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label={`Delete ${view.label}`}
                          onClick={() => handleDeleteSection(view.value)}
                        >
                          <IconX className="size-4" />
                        </Button>
                      )}
                      {isDefaultSection && (
                        <Badge variant="outline" className="h-7 px-2 text-[10px]">
                          Default
                        </Badge>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Done</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
      <TabsContent
        value="outline"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value: any) => {
                  table.setPageSize(Number(value))
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      {allViews.map((view) => (
        <TabsContent
          key={view.value}
          value={view.value}
          className="flex flex-col px-4 lg:px-6"
        >
          <div className="w-full flex-1 overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Cover</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-24">Rating</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isSectionBooksLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      Loading books...
                    </TableCell>
                  </TableRow>
                ) : sectionBooks.filter((book) => book.section_id === view.value).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                      No books in this section yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  sectionBooks
                    .filter((book) => book.section_id === view.value)
                    .map((book) => (
                      <TableRow key={book.id}>
                        <TableCell>
                          {book.cover_url ? (
                            <img
                              src={book.cover_url}
                              alt={book.title}
                              className="h-12 w-9 rounded object-cover"
                            />
                          ) : (
                            <div className="bg-accent h-12 w-9 rounded" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{book.title}</p>
                            <p className="text-muted-foreground truncate text-xs">
                              {book.author ?? "Unknown Author"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            value={book.rating ?? ""}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                              handleSectionBookRatingChange(book.id, event.target.value)
                            }
                            className="h-8"
                            placeholder="0-5"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={book.notes ?? ""}
                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                              handleSectionBookNotesChange(book.id, event.target.value)
                            }
                            className="h-8"
                            placeholder="Add a short note"
                          />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground"
                              >
                                <IconDotsVertical className="h-4 w-4" />
                                <span className="sr-only">Open row actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleSaveSectionBook(book.id)}>
                                Save changes
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleDeleteSectionBook(book.id)}
                              >
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--primary)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.header}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.header}</DrawerTitle>
          <DrawerDescription>
            Showing total visitors for the last 6 months
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
          {!isMobile && (
            <>
              <ChartContainer config={chartConfig}>
                <AreaChart
                  accessibilityLayer
                  data={chartData}
                  margin={{
                    left: 0,
                    right: 10,
                  }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(0, 3)}
                    hide
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="mobile"
                    type="natural"
                    fill="var(--color-mobile)"
                    fillOpacity={0.6}
                    stroke="var(--color-mobile)"
                    stackId="a"
                  />
                  <Area
                    dataKey="desktop"
                    type="natural"
                    fill="var(--color-desktop)"
                    fillOpacity={0.4}
                    stroke="var(--color-desktop)"
                    stackId="a"
                  />
                </AreaChart>
              </ChartContainer>
              <Separator />
              <div className="grid gap-2">
                <div className="flex gap-2 leading-none font-medium">
                  Trending up by 5.2% this month{" "}
                  <IconTrendingUp className="size-4" />
                </div>
                <div className="text-muted-foreground">
                  Showing total visitors for the last 6 months. This is just
                  some random text to test the layout. It spans multiple lines
                  and should wrap around.
                </div>
              </div>
              <Separator />
            </>
          )}
          <form className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="header">Header</Label>
              <Input id="header" defaultValue={item.header} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="type">Type</Label>
                <Select defaultValue={item.type}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Table of Contents">
                      Table of Contents
                    </SelectItem>
                    <SelectItem value="Executive Summary">
                      Executive Summary
                    </SelectItem>
                    <SelectItem value="Technical Approach">
                      Technical Approach
                    </SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Capabilities">Capabilities</SelectItem>
                    <SelectItem value="Focus Documents">
                      Focus Documents
                    </SelectItem>
                    <SelectItem value="Narrative">Narrative</SelectItem>
                    <SelectItem value="Cover Page">Cover Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="status">Status</Label>
                <Select defaultValue={item.status}>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Done">Done</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-3">
                <Label htmlFor="target">Target</Label>
                <Input id="target" defaultValue={item.target} />
              </div>
              <div className="flex flex-col gap-3">
                <Label htmlFor="limit">Limit</Label>
                <Input id="limit" defaultValue={item.limit} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="reviewer">Reviewer</Label>
              <Select defaultValue={item.reviewer}>
                <SelectTrigger id="reviewer" className="w-full">
                  <SelectValue placeholder="Select a reviewer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Eddie Lake">Eddie Lake</SelectItem>
                  <SelectItem value="Jamik Tashpulatov">
                    Jamik Tashpulatov
                  </SelectItem>
                  <SelectItem value="Emily Whalen">Emily Whalen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>
        <DrawerFooter>
          <Button>Submit</Button>
          <DrawerClose asChild>
            <Button variant="outline">Done</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
