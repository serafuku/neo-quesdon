type username = {
  username: string[] | undefined;
  width: number;
  height: number;
};

export default function NameComponents({ username, width, height }: username) {
  return (
    <div className="flex items-center">
      {username && username.length > 0 ? (
        <div className="flex items-center">
          {username?.map((el, key) => (
            <div key={key}>
              {el.toString().substring(0, 8) === "https://" ? (
                <img
                  className={`mx-1`}
                  style={{ width: width, height: height }}
                  alt="Custom Emoji In Username"
                  src={el}
                />
              ) : (
                <span>{el}</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <span className="loading loading-spinner loading-lg" />
      )}
    </div>
  );
}
