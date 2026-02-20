import { useNavigate } from "react-router-dom"

import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { BookSearch } from "@/components/book-search"
import bookStackImage from "@/assets/book2.png"

export function SectionCards() {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 lg:px-6 w-full min-h-screen md:min-h-[60vh]">
      <div className="min-h-[50vh] md:min-h-full flex flex-col">
        <CardHeader className="flex-1 flex flex-col justify-between pb-0">
          <div>
            <CardTitle className="text-6xl font-bold mb-6 leading-tight text-foreground tracking-tight">
              Your reading life,<br />arranged like a gallery.
            </CardTitle>
            <p className="text-base text-muted-foreground mb-8 leading-relaxed max-w-sm font-light">
              Search for a book, add a rating and a note, then place it on a shelf. Share a clean, custom link in your bio — or keep it private.
            </p>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-stretch gap-4 mt-auto">
          <BookSearch />
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 border border-input rounded-lg">
              <div className="text-sm font-semibold mb-1">Shelf views</div>
              <p className="text-xs text-muted-foreground">Want to Read, Currently Reading, Finished.</p>
            </div>
            <div className="p-4 border border-input rounded-lg">
              <div className="text-sm font-semibold mb-1">Ratings</div>
              <p className="text-xs text-muted-foreground">A tiny ritual that makes it yours.</p>
            </div>
            <div className="p-4 border border-input rounded-lg">
              <div className="text-sm font-semibold mb-1">Notes</div>
              <p className="text-xs text-muted-foreground">Leave a line you'll remember later.</p>
            </div>
          </div>
        </CardFooter>
      </div>
      <div className="min-h-[50vh] md:min-h-full flex flex-col">
        <div className="flex-1 p-6 flex flex-col">
          <Card className="bg-card border border-input rounded-2xl p-8 flex flex-col flex-1">
            <div className="flex flex-row items-start justify-between mb-6">
              <div>
                <h2 className="text-l text-muted-foreground tracking-tight mb-2">Your link</h2>
                <p className="text-2xl font-bold tracking-tight">plottwist.pro/@dmajor</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-medium text-foreground border border-input rounded-lg hover:bg-accent transition-colors whitespace-nowrap">
                  Edit Username →
                </button>
                <button 
                  onClick={() => navigate('/shelf')}
                  className="px-3 py-1.5 text-xs font-medium text-foreground border border-input rounded-lg hover:bg-accent transition-colors whitespace-nowrap">
                  Preview →
                </button>
              </div>
            </div>
            <div className="w-full h-56 bg-gradient-to-br from-amber-100 via-orange-100 to-purple-200 rounded-xl flex items-center justify-center mb-8 overflow-hidden">
              <img 
                src={bookStackImage} 
                alt="Book Stack" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex justify-around mt-auto pt-8 gap-3">
              <div className="flex-1 p-4 border border-input rounded-lg text-center bg-accent/5">
                <div className="text-3xl font-bold tracking-tight">1</div>
                <div className="text-xs text-muted-foreground mt-2">Books</div>
              </div>
              <div className="flex-1 p-4 border border-input rounded-lg text-center bg-accent/5">
                <div className="text-3xl font-bold tracking-tight">5</div>
                <div className="text-xs text-muted-foreground mt-2">Avg rating</div>
              </div>
              <div className="flex-1 p-4 border border-input rounded-lg text-center bg-accent/5">
                <div className="text-3xl font-bold tracking-tight">3</div>
                <div className="text-xs text-muted-foreground mt-2">Shelves</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
