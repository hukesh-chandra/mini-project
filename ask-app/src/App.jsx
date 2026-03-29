import { useState, useEffect } from 'react';
import './App.css';

function Text({ content }) {
  return <h2 className="text">{content}</h2>;
}

function Image({ src }) {
  return <img className="image" src={src} alt="Scene" />;
}

export default function App() {
  const [noCount, setNoCount] = useState(0);
  const [final, setFinal] = useState(false);
  const [popups, setPopups] = useState([]);
  const [text, setText] = useState("Will you be the ballerina cappuccina to my cappucino assassino?");
  const [image, setImage] = useState("/src.png");

  const spamText = "Aaaaaaaa🎉🎉🎉";

  const handleClick = (type) => {
    if (final) return;

    if (type === 'yes') {
      setText("You said yes! 💘");
      setImage("/srcf.png");
      setTimeout(() => setFinal(true), 1000);
    } else {
      const newCount = noCount + 1;
      setNoCount(newCount);

      if (newCount === 1) {
        setText("You really said no to me :( ");
        setImage("/tb1.jpg");
      } else if (newCount === 2) {
        setText("Did you really just said no 2 times to me?");
        setImage("/tb.jpg");
      } else {
        setText(`No... (${newCount} times?)`);
        setImage("/tb.jpg"); // Use a default or looped image
      }
    }
  };

  // Spam logic
  useEffect(() => {
    if (!final) return;

    const interval = setInterval(() => {
      setPopups((prev) => [
        ...prev,
        {
          id: Math.random(),
          top: Math.random() * 100 + '%',
          left: Math.random() * 100 + '%',
        },
      ]);
    }, 100);

    return () => clearInterval(interval);
  }, [final]);

  if (final) {
    return (
      <div className="spam-screen">
        {popups.map((popup) => (
          <span
            key={popup.id}
            className="popup"
            style={{ top: popup.top, left: popup.left }}
          >
            {spamText}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="box">
        <Text content={text} />
        <Image src={image} />
        <div className="buttons">
          <button onClick={() => handleClick('yes')}>Yes</button>
          <button onClick={() => handleClick('no')}>No</button>
        </div>
      </div>
    </div>
  );
}
