import "./MemoryGrid.css";
import { useMemo, useState, useEffect } from 'react';
import { AlarmClock, Bell, Book, Clock, Globe, Heart, Moon, Music } from 'lucide-react';


export default function MemoryGrid() {
  const [clickedIcons, setClickedIcons] = useState([]);
  const [matchedIcons, setMatchedIcons] = useState([]);
  
  const handleCardClick = (Icon) => {
    setClickedIcons([...clickedIcons, Icon]);
    checkForMatch();
  }

  const checkForMatch = () => {
    if (clickedIcons.length === 2) {
      if (clickedIcons[0] === clickedIcons[1]) {
        setClickedIcons([]);
        setMatchedIcons([...matchedIcons, clickedIcons[0]]);
      } else {
        setClickedIcons([]);
      }
    }
  }

  useEffect(() => {
    checkForMatch();
  }, [clickedIcons]);

  const icons = [AlarmClock, Bell, Book, Clock, Globe, Heart, Moon, Music];
  
  // Create an array with each icon duplicated, then shuffle it
  const shuffledIcons = useMemo(() => {
    // Duplicate each icon (8 icons * 2 = 16 cards)
    const duplicatedIcons = [...icons, ...icons];
    
    // Shuffle the array using Fisher-Yates algorithm
    const shuffled = [...duplicatedIcons];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }, []);

  return (
    <div className="memory-grid">
      {shuffledIcons.map((Icon, index) => (
        <div onClick={() => handleCardClick(Icon)} key={index} className={`memory-card ${ matchedIcons.includes(Icon) ? 'matched' : '' }`}>
          <Icon size={32} />
        </div>
      ))}
    </div>
  );
}
