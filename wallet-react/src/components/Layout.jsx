import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';

export default function Layout({
  children,
  showAddButton = true,
  showSearch = true,
  onSearchKeyword,
  onSearchSuggest,
  searchSuggestions = [],
  onSelectSearchSuggestion,
}) {
  return (
    <div className="min-h-[100dvh] min-h-screen flex flex-col pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <Header
        showAddButton={showAddButton}
        showSearch={showSearch}
        onSearchKeyword={onSearchKeyword}
        onSearchSuggest={onSearchSuggest}
        searchSuggestions={searchSuggestions}
        onSelectSearchSuggestion={onSelectSearchSuggestion}
      />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
      {showAddButton ? (
        <BottomNav
          searchSuggestions={searchSuggestions}
          onSearchKeyword={onSearchKeyword}
          onSearchSuggest={onSearchSuggest}
          onSelectSearchSuggestion={onSelectSearchSuggestion}
        />
      ) : null}
    </div>
  );
}

